"use server";

import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { sanitizeRichText } from "@/lib/sanitize";
import { addisLocalToDate, fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { NewsSchema } from "@/schemas/admin/content";
import { resolveSlug } from "@/server/admin/slug";
import { BulkSchema, type BulkResult } from "./bulk-types";

/** News: PUBLISHED + a future publish date = scheduled (D-12). */
export async function saveNews(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = NewsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.newsPost.findUnique({ where: { id }, select: { slug: true, status: true, publishedAt: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Post not found." };
  const slug = await resolveSlug("newsPost", d.slug, d.titleEn, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };
  const body = sanitizeRichText(d.bodyEn);
  if (!body) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: { bodyEn: "Write the article body." } };

  const publishedAt = addisLocalToDate(d.publishedAt) ?? (d.status === "PUBLISHED" ? (before?.publishedAt ?? new Date()) : null);
  const data = {
    slug: slug.slug,
    titleEn: d.titleEn,
    titleAm: d.titleAm,
    excerptEn: d.excerptEn,
    excerptAm: d.excerptAm,
    bodyEn: body,
    bodyAm: sanitizeRichText(d.bodyAm),
    coverId: d.coverId,
    tags: d.tags,
    featured: d.featured,
    status: d.status,
    publishedAt,
  };
  const saved = id
    ? await prisma.newsPost.update({ where: { id }, data, select: { id: true } })
    : await prisma.newsPost.create({ data: { ...data, authorId: a.user.id }, select: { id: true } });
  invalidate(TAGS_FOR.news(before?.slug, slug.slug));
  const action = !id ? "create" : before?.status !== "PUBLISHED" && d.status === "PUBLISHED" ? "publish" : before?.status === "PUBLISHED" && d.status !== "PUBLISHED" ? "unpublish" : "update";
  await logActivity({ userId: a.user.id, action, entityType: "NewsPost", entityId: saved.id, meta: { label: d.titleEn } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

export async function bulkNews(input: unknown): Promise<BulkResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.newsPost.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, titleEn: true } });
  if (op === "delete") await prisma.newsPost.deleteMany({ where: { id: { in: ids } } });
  else if (op === "publish") {
    await prisma.newsPost.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED" } });
    await prisma.newsPost.updateMany({ where: { id: { in: ids }, publishedAt: null }, data: { publishedAt: new Date() } });
  } else await prisma.newsPost.updateMany({ where: { id: { in: ids } }, data: { status: op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate(TAGS_FOR.news(...rows.map((r) => r.slug)));
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "NewsPost", entityId: r.id, meta: { label: r.titleEn } });
  return { ok: true, count: rows.length };
}

export async function deleteNews(id: string) {
  return bulkNews({ ids: [z.string().min(1).parse(id)], op: "delete" });
}
