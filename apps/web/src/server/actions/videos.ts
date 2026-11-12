"use server";

import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { addisLocalToDate, fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { VideoSchema } from "@/schemas/admin/content";
import { resolveSlug } from "@/server/admin/slug";
import { BulkSchema, type BulkResult } from "./bulk-types";

export async function saveVideo(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = VideoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.video.findUnique({ where: { id }, select: { status: true, publishedAt: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Video not found." };
  const slug = await resolveSlug("video", d.slug, d.titleEn, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };

  const publishedAt = addisLocalToDate(d.publishedAt) ?? (d.status === "PUBLISHED" ? (before?.publishedAt ?? new Date()) : null);
  const data = {
    slug: slug.slug,
    titleEn: d.titleEn,
    titleAm: d.titleAm,
    type: d.type,
    source: d.source,
    youtubeUrl: d.source === "YOUTUBE" ? d.youtubeUrl : null,
    mediaId: d.source === "UPLOAD" ? d.mediaId : null,
    captionsUrl: d.source === "UPLOAD" ? d.captionsUrl : null,
    posterId: d.posterId,
    episodeId: d.episodeId,
    featured: d.featured,
    status: d.status,
    publishedAt,
  };
  const saved = await prisma.$transaction(async (tx) => {
    const row = id ? await tx.video.update({ where: { id }, data, select: { id: true } }) : await tx.video.create({ data, select: { id: true } });
    await tx.videoArtist.deleteMany({ where: { videoId: row.id } });
    if (d.artistIds.length) await tx.videoArtist.createMany({ data: d.artistIds.map((artistId) => ({ videoId: row.id, artistId })), skipDuplicates: true });
    return row;
  });
  invalidate(TAGS_FOR.video());
  const action = !id ? "create" : before?.status !== "PUBLISHED" && d.status === "PUBLISHED" ? "publish" : before?.status === "PUBLISHED" && d.status !== "PUBLISHED" ? "unpublish" : "update";
  await logActivity({ userId: a.user.id, action, entityType: "Video", entityId: saved.id, meta: { label: d.titleEn } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

export async function bulkVideos(input: unknown): Promise<BulkResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.video.findMany({ where: { id: { in: ids } }, select: { id: true, titleEn: true, publishedAt: true } });
  if (op === "delete") await prisma.video.deleteMany({ where: { id: { in: ids } } });
  else if (op === "publish") {
    await prisma.video.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED" } });
    await prisma.video.updateMany({ where: { id: { in: ids }, publishedAt: null }, data: { publishedAt: new Date() } });
  } else await prisma.video.updateMany({ where: { id: { in: ids } }, data: { status: op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate(TAGS_FOR.video());
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "Video", entityId: r.id, meta: { label: r.titleEn } });
  return { ok: true, count: rows.length };
}

export async function deleteVideo(id: string) {
  return bulkVideos({ ids: [z.string().min(1).parse(id)], op: "delete" });
}
