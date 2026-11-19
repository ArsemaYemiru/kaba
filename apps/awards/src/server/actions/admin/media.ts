"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { getStorage } from "@/lib/storage";
import { fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { MediaUpdateSchema } from "@/schemas/admin/content";
import { clearSettingsMediaRefs } from "@/server/admin/settings-refs";
import { mediaUsages, type MediaUsage } from "@/server/admin/media-usage";
import { mediaSelect } from "@/server/queries/media";

const pickerSelect = { ...mediaSelect, tags: true, sizeBytes: true, createdAt: true } satisfies Prisma.MediaSelect;
export type PickerMedia = Prisma.MediaGetPayload<{ select: typeof pickerSelect }>;

const ListInput = z.object({
  type: z.enum(["IMAGE", "VIDEO"]).optional(),
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(40).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
});

/** Media Library listing for pickers (paged, newest first). */
export async function listMediaForPicker(input: unknown): Promise<{ items: PickerMedia[]; total: number; pageSize: number } | { error: string }> {
  const a = await authorize();
  if (!a.ok) return { error: a.error };
  const f = ListInput.parse(input ?? {});
  const where: Prisma.MediaWhereInput = {
    ...(f.type ? { type: f.type } : {}),
    ...(f.tag ? { tags: { has: f.tag } } : {}),
    ...(f.q ? { OR: [{ alt: { contains: f.q, mode: "insensitive" } }, { caption: { contains: f.q, mode: "insensitive" } }, { credit: { contains: f.q, mode: "insensitive" } }] } : {}),
  };
  const pageSize = 30;
  const [items, total] = await Promise.all([
    prisma.media.findMany({ where, select: pickerSelect, orderBy: { createdAt: "desc" }, skip: (f.page - 1) * pageSize, take: pageSize }),
    prisma.media.count({ where }),
  ]);
  return { items, total, pageSize };
}

/** Update alt/caption/credit/tags. Alt text is required for images (spec §5). */
export async function updateMedia(id: string, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const media = await prisma.media.findUnique({ where: { id }, select: { type: true } });
  if (!media) return { ok: false, status: 404, error: "Media not found." };
  const parsed = MediaUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  if (media.type === "IMAGE" && !parsed.data.alt) return { ok: false, status: 400, error: "Alt text is required for images.", fieldErrors: { alt: "Describe the image for people who can't see it." } };
  await prisma.media.update({ where: { id }, data: parsed.data });
  invalidate(TAGS_FOR.media());
  await logActivity({ userId: a.user.id, action: "update", entityType: "Media", entityId: id, meta: { label: parsed.data.alt.slice(0, 80) } });
  return { ok: true, id };
}

export async function getMediaUsage(ids: string[]): Promise<Record<string, MediaUsage[]> | { error: string }> {
  const a = await authorize();
  if (!a.ok) return { error: a.error };
  const usage = await mediaUsages(z.array(z.string()).max(200).parse(ids));
  return Object.fromEntries(usage);
}

/**
 * Delete media. In-use items need `confirmInUse` (the UI lists where they're
 * used first); references are cleared (FK SetNull/Cascade + Site Settings JSON).
 */
export async function deleteMedia(input: unknown): Promise<{ ok: true; deleted: number } | { ok: false; status: number; error: string; usages?: Record<string, MediaUsage[]> }> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, confirmInUse } = z.object({ ids: z.array(z.string().min(1)).min(1).max(200), confirmInUse: z.boolean().default(false) }).parse(input);
  const usage = await mediaUsages(ids);
  const inUse = Object.fromEntries([...usage].filter(([, u]) => u.length > 0));
  if (Object.keys(inUse).length && !confirmInUse) return { ok: false, status: 409, error: "Some files are in use.", usages: inUse };

  const rows = await prisma.media.findMany({ where: { id: { in: ids } }, select: { id: true, storageKey: true, variants: true, alt: true } });
  await clearSettingsMediaRefs(ids);
  await prisma.media.deleteMany({ where: { id: { in: ids } } });

  const storage = getStorage();
  for (const r of rows) {
    const keys = new Set<string>([r.storageKey, ...Object.values((r.variants as Record<string, string> | null) ?? {})]);
    for (const k of keys) await storage.delete(k).catch((e) => console.error("[media] storage delete failed", k, e));
    await logActivity({ userId: a.user.id, action: "delete", entityType: "Media", entityId: r.id, meta: { label: r.alt.slice(0, 80) } });
  }
  invalidate(TAGS_FOR.media());
  return { ok: true, deleted: rows.length };
}
