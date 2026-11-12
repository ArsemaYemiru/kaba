"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { SUBMISSION_STATUSES, SubmissionUpdateSchema } from "@/schemas/admin/content";

export async function updateSubmission(input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = SubmissionUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid input.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { id, status, notes } = parsed.data;
  const row = await prisma.submission.update({ where: { id }, data: { status, notes }, select: { id: true, name: true } }).catch(() => null);
  if (!row) return { ok: false, status: 404, error: "Submission not found." };
  await logActivity({ userId: a.user.id, action: "update", entityType: "Submission", entityId: id, meta: { label: `${row.name} → ${status}` } });
  revalidatePath("/admin", "layout"); // unread badge
  return { ok: true, id };
}

const Bulk = z.object({ ids: z.array(z.string().min(1)).min(1).max(500), op: z.union([z.enum(SUBMISSION_STATUSES), z.literal("DELETE")]) });

export async function bulkSubmissions(input: unknown): Promise<{ ok: true; count: number } | { ok: false; status: number; error: string }> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = Bulk.parse(input);
  const count =
    op === "DELETE"
      ? (await prisma.submission.deleteMany({ where: { id: { in: ids } } })).count
      : (await prisma.submission.updateMany({ where: { id: { in: ids } }, data: { status: op } })).count;
  await logActivity({ userId: a.user.id, action: op === "DELETE" ? "delete" : "update", entityType: "Submission", meta: { label: `${count} × ${op}` } });
  revalidatePath("/admin", "layout");
  return { ok: true, count };
}
