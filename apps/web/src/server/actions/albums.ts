"use server";

import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { AlbumSchema } from "@/schemas/admin/content";
import { resolveSlug } from "@/server/admin/slug";
import { BulkSchema, type BulkResult } from "./bulk-types";

export async function saveAlbum(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = AlbumSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.album.findUnique({ where: { id }, select: { slug: true, status: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Album not found." };
  const slug = await resolveSlug("album", d.slug, d.titleEn, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };
  const data = {
    slug: slug.slug,
    titleEn: d.titleEn,
    titleAm: d.titleAm,
    descriptionEn: d.descriptionEn,
    descriptionAm: d.descriptionAm,
    coverId: d.coverId ?? d.items[0]?.mediaId ?? null,
    episodeId: d.episodeId,
    status: d.status,
  };
  const saved = await prisma.$transaction(async (tx) => {
    const row = id ? await tx.album.update({ where: { id }, data, select: { id: true } }) : await tx.album.create({ data, select: { id: true } });
    await tx.albumItem.deleteMany({ where: { albumId: row.id } });
    if (d.items.length) await tx.albumItem.createMany({ data: d.items.map((it, i) => ({ albumId: row.id, mediaId: it.mediaId, caption: it.caption, sortOrder: i })) });
    return row;
  });
  invalidate(TAGS_FOR.album(before?.slug, slug.slug));
  const action = !id ? "create" : before?.status !== "PUBLISHED" && d.status === "PUBLISHED" ? "publish" : before?.status === "PUBLISHED" && d.status !== "PUBLISHED" ? "unpublish" : "update";
  await logActivity({ userId: a.user.id, action, entityType: "Album", entityId: saved.id, meta: { label: d.titleEn } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

export async function bulkAlbums(input: unknown): Promise<BulkResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.album.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, titleEn: true } });
  if (op === "delete") await prisma.album.deleteMany({ where: { id: { in: ids } } });
  else await prisma.album.updateMany({ where: { id: { in: ids } }, data: { status: op === "publish" ? "PUBLISHED" : op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate(TAGS_FOR.album(...rows.map((r) => r.slug)));
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "Album", entityId: r.id, meta: { label: r.titleEn } });
  return { ok: true, count: rows.length };
}

export async function deleteAlbum(id: string) {
  return bulkAlbums({ ids: [z.string().min(1).parse(id)], op: "delete" });
}
