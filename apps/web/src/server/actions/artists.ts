"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { sanitizeRichText } from "@/lib/sanitize";
import { fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { ArtistSchema } from "@/schemas/admin/content";
import { resolveSlug } from "@/server/admin/slug";
import { BulkSchema, type BulkResult } from "./bulk-types";

/** Create (id = null) or update an artist. */
export async function saveArtist(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = ArtistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;

  const before = id ? await prisma.artist.findUnique({ where: { id }, select: { slug: true, status: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Artist not found." };
  const slug = await resolveSlug("artist", d.slug, d.nameEn, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };

  const data = {
    slug: slug.slug,
    nameEn: d.nameEn,
    nameAm: d.nameAm,
    stageName: d.stageName,
    legalNameEn: d.legalNameEn,
    legalNameAm: d.legalNameAm,
    isGroup: d.isGroup,
    categories: d.categories,
    shortBioEn: d.shortBioEn,
    shortBioAm: d.shortBioAm,
    bioEn: sanitizeRichText(d.bioEn),
    bioAm: sanitizeRichText(d.bioAm),
    birthYear: d.birthYear,
    deathYear: d.deathYear,
    yearsActive: d.yearsActive,
    genres: d.genres,
    notableWorks: d.notableWorks as Prisma.InputJsonValue,
    socialLinks: d.socialLinks as Prisma.InputJsonValue,
    portraitId: d.portraitId,
    coverId: d.coverId,
    isLegend: d.isLegend,
    featured: d.featured,
    status: d.status,
    sortOrder: d.sortOrder,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
  };

  const saved = await prisma.$transaction(async (tx) => {
    const row = id ? await tx.artist.update({ where: { id }, data, select: { id: true } }) : await tx.artist.create({ data, select: { id: true } });
    await tx.artistMedia.deleteMany({ where: { artistId: row.id } });
    if (d.galleryIds.length) await tx.artistMedia.createMany({ data: d.galleryIds.map((mediaId, i) => ({ artistId: row.id, mediaId, sortOrder: i })), skipDuplicates: true });
    await tx.videoArtist.deleteMany({ where: { artistId: row.id } });
    if (d.videoIds.length) await tx.videoArtist.createMany({ data: d.videoIds.map((videoId) => ({ artistId: row.id, videoId })), skipDuplicates: true });
    return row;
  });

  invalidate(TAGS_FOR.artist(before?.slug, slug.slug));
  const action = !id ? "create" : before?.status !== d.status && d.status === "PUBLISHED" ? "publish" : before?.status === "PUBLISHED" && d.status !== "PUBLISHED" ? "unpublish" : "update";
  await logActivity({ userId: a.user.id, action, entityType: "Artist", entityId: saved.id, meta: { label: d.nameEn } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

export async function bulkArtists(input: unknown): Promise<BulkResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.artist.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, nameEn: true } });
  if (op === "delete") await prisma.artist.deleteMany({ where: { id: { in: ids } } });
  else await prisma.artist.updateMany({ where: { id: { in: ids } }, data: { status: op === "publish" ? "PUBLISHED" : op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate(TAGS_FOR.artist(...rows.map((r) => r.slug)));
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "Artist", entityId: r.id, meta: { label: r.nameEn } });
  return { ok: true, count: rows.length };
}

export async function deleteArtist(id: string) {
  return bulkArtists({ ids: [z.string().min(1).parse(id)], op: "delete" });
}
