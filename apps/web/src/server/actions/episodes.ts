"use server";

import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { sanitizeRichText } from "@/lib/sanitize";
import { fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { EpisodeSchema } from "@/schemas/admin/content";
import { resolveSlug } from "@/server/admin/slug";
import { BulkSchema, type BulkResult } from "./bulk-types";

export async function saveEpisode(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = EpisodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.episode.findUnique({ where: { id }, select: { slug: true, status: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Episode not found." };
  const slug = await resolveSlug("episode", d.slug, d.titleEn, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };

  const data = {
    slug: slug.slug,
    titleEn: d.titleEn,
    titleAm: d.titleAm,
    season: d.season,
    episodeNumber: d.episodeNumber,
    type: d.type,
    airDate: d.airDate ? new Date(`${d.airDate}T00:00:00Z`) : null,
    descriptionEn: sanitizeRichText(d.descriptionEn),
    descriptionAm: sanitizeRichText(d.descriptionAm),
    videoSource: d.videoSource,
    youtubeUrl: d.videoSource === "YOUTUBE" ? d.youtubeUrl : null,
    videoMediaId: d.videoSource === "UPLOAD" ? d.videoMediaId : null,
    thumbnailId: d.thumbnailId,
    winnerSide: d.result === "A" || d.result === "B" ? d.result : null,
    isTie: d.result === "TIE",
    featured: d.featured,
    status: d.status,
  };

  const saved = await prisma.$transaction(async (tx) => {
    const row = id ? await tx.episode.update({ where: { id }, data, select: { id: true } }) : await tx.episode.create({ data, select: { id: true } });
    await tx.episodeParticipant.deleteMany({ where: { episodeId: row.id } });
    if (d.participants.length)
      await tx.episodeParticipant.createMany({
        data: d.participants.map((p, i) => ({ episodeId: row.id, side: p.side, artistId: p.artistId, guestName: p.artistId ? null : p.guestName, order: i })),
      });
    await tx.episodeRound.deleteMany({ where: { episodeId: row.id } });
    if (d.rounds.length)
      await tx.episodeRound.createMany({ data: d.rounds.map((r, i) => ({ episodeId: row.id, order: i, nameEn: r.nameEn, nameAm: r.nameAm, scoreA: r.scoreA, scoreB: r.scoreB })) });
    await tx.episodeMedia.deleteMany({ where: { episodeId: row.id } });
    if (d.galleryIds.length) await tx.episodeMedia.createMany({ data: d.galleryIds.map((mediaId, i) => ({ episodeId: row.id, mediaId, sortOrder: i })), skipDuplicates: true });
    return row;
  });

  invalidate(TAGS_FOR.episode(before?.slug, slug.slug));
  const action = !id ? "create" : before?.status !== "PUBLISHED" && d.status === "PUBLISHED" ? "publish" : before?.status === "PUBLISHED" && d.status !== "PUBLISHED" ? "unpublish" : "update";
  await logActivity({ userId: a.user.id, action, entityType: "Episode", entityId: saved.id, meta: { label: d.titleEn } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

export async function bulkEpisodes(input: unknown): Promise<BulkResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.episode.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, titleEn: true } });
  if (op === "delete") await prisma.episode.deleteMany({ where: { id: { in: ids } } });
  else await prisma.episode.updateMany({ where: { id: { in: ids } }, data: { status: op === "publish" ? "PUBLISHED" : op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate(TAGS_FOR.episode(...rows.map((r) => r.slug)));
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "Episode", entityId: r.id, meta: { label: r.titleEn } });
  return { ok: true, count: rows.length };
}

export async function deleteEpisode(id: string) {
  return bulkEpisodes({ ids: [z.string().min(1).parse(id)], op: "delete" });
}
