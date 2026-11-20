"use server";

import Papa from "papaparse";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { slugify } from "@/lib/slug";
import { AddArtistsSchema, CategorySchema, CSV_COLUMNS, EditionSchema, HonoreeCsvRow, HonoreeSchema, ReorderSchema } from "@/schemas/admin/awards";
import { addisLocalToDate, fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { BulkSchema, type BulkResult } from "@/server/admin/bulk-types";
import { resolveSlug } from "@/server/admin/slug";

const BAD = "Please fix the highlighted fields.";
const statusAction = (before: string | undefined, after: string, isNew: boolean) =>
  isNew ? "create" : before !== "PUBLISHED" && after === "PUBLISHED" ? "publish" : before === "PUBLISHED" && after !== "PUBLISHED" ? "unpublish" : "update";
const bulkStatus = (op: "publish" | "unpublish" | "archive") => (op === "publish" ? "PUBLISHED" : op === "unpublish" ? "DRAFT" : "ARCHIVED");

/* ───────────────────────── Editions ───────────────────────── */

export async function saveEdition(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = EditionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: BAD, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.awardEdition.findUnique({ where: { id }, select: { status: true, slug: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Edition not found." };
  const slug = d.slug ?? String(d.year);
  const clash = await prisma.awardEdition.findFirst({ where: { OR: [{ slug }, { year: d.year }], ...(id ? { NOT: { id } } : {}) }, select: { year: true, slug: true } });
  if (clash) return { ok: false, status: 409, error: "Another edition uses that year or slug.", fieldErrors: clash.year === d.year ? { year: "Another edition uses this year." } : { slug: "Another edition uses this slug." } };
  const data = {
    year: d.year,
    slug,
    nameEn: d.nameEn,
    nameAm: d.nameAm,
    ceremonyAt: addisLocalToDate(d.ceremonyAt),
    venue: d.venue,
    broadcastPartner: d.broadcastPartner,
    heroMediaId: d.heroMediaId,
    status: d.status,
  };
  const saved = id ? await prisma.awardEdition.update({ where: { id }, data, select: { id: true } }) : await prisma.awardEdition.create({ data, select: { id: true } });
  invalidate(TAGS_FOR.awards(slug, before?.slug));
  await logActivity({ userId: a.user.id, action: statusAction(before?.status, d.status, !id), entityType: "AwardEdition", entityId: saved.id, meta: { label: d.nameEn } });
  return { ok: true, id: saved.id, slug };
}

export async function deleteEdition(id: string): Promise<BulkResult | { ok: false; error: string }> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return a;
  const e = await prisma.awardEdition.findUnique({ where: { id: z.string().min(1).parse(id) }, select: { nameEn: true, slug: true } });
  if (!e) return { ok: true, count: 0 };
  await prisma.awardEdition.delete({ where: { id } });
  invalidate(TAGS_FOR.awards(e.slug));
  await logActivity({ userId: a.user.id, action: "delete", entityType: "AwardEdition", entityId: id, meta: { label: e.nameEn } });
  return { ok: true, count: 1 };
}

/* ───────────────────────── Genre categories ───────────────────────── */

export async function saveCategory(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: BAD, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.awardCategory.findUnique({ where: { id }, select: { status: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Category not found." };
  if (!(await prisma.awardEdition.findUnique({ where: { id: d.editionId }, select: { id: true } }))) return { ok: false, status: 400, error: BAD, fieldErrors: { editionId: "Choose an edition." } };
  const base = d.slug ?? slugify(d.nameEn);
  const clash = await prisma.awardCategory.findFirst({ where: { editionId: d.editionId, slug: base, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) return { ok: false, status: 409, error: "That slug is taken in this edition.", fieldErrors: { slug: "Already used in this edition." } };
  const nextOrder = d.sortOrder ?? ((await prisma.awardCategory.aggregate({ where: { editionId: d.editionId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  const data = {
    editionId: d.editionId,
    nameEn: d.nameEn,
    nameAm: d.nameAm,
    slug: base,
    descriptionEn: d.descriptionEn,
    descriptionAm: d.descriptionAm,
    icon: d.icon,
    sortOrder: nextOrder,
    status: d.status,
  };
  const select = { id: true, edition: { select: { slug: true } } } as const;
  const saved = id ? await prisma.awardCategory.update({ where: { id }, data, select }) : await prisma.awardCategory.create({ data, select });
  invalidate(TAGS_FOR.awards(saved.edition.slug));
  await logActivity({ userId: a.user.id, action: statusAction(before?.status, d.status, !id), entityType: "AwardCategory", entityId: saved.id, meta: { label: d.nameEn } });
  return { ok: true, id: saved.id, slug: base };
}

export async function reorderCategories(input: unknown) {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids } = ReorderSchema.parse(input);
  await prisma.$transaction(ids.map((id, i) => prisma.awardCategory.update({ where: { id }, data: { sortOrder: i + 1 } })));
  invalidate(TAGS_FOR.awards());
  await logActivity({ userId: a.user.id, action: "update", entityType: "AwardCategory", meta: { label: "Reordered categories", count: ids.length } });
  return { ok: true as const };
}

export async function bulkCategories(input: unknown): Promise<BulkResult | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.awardCategory.findMany({ where: { id: { in: ids } }, select: { id: true, nameEn: true } });
  if (op === "delete") await prisma.awardCategory.deleteMany({ where: { id: { in: ids } } });
  else await prisma.awardCategory.updateMany({ where: { id: { in: ids } }, data: { status: bulkStatus(op) } });
  invalidate(TAGS_FOR.awards());
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "AwardCategory", entityId: r.id, meta: { label: r.nameEn } });
  return { ok: true, count: rows.length };
}

/* ───────────────────────── Honorees ───────────────────────── */

/** Honoree slugs read as "<artist>-<genre>-<year>", made unique if needed. */
async function honoreeSlug(explicit: string | null, artistSlug: string, categorySlug: string, year: number, excludeId?: string) {
  return resolveSlug("nominee", explicit, `${artistSlug} ${categorySlug} ${year}`, excludeId);
}

export async function saveHonoree(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = HonoreeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: BAD, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.nominee.findUnique({ where: { id }, select: { status: true, slug: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Honoree not found." };
  const [category, artist] = await Promise.all([
    prisma.awardCategory.findUnique({ where: { id: d.categoryId }, select: { slug: true, edition: { select: { slug: true, year: true } } } }),
    prisma.artist.findUnique({ where: { id: d.artistId }, select: { slug: true, nameEn: true, nameAm: true } }),
  ]);
  if (!category) return { ok: false, status: 400, error: BAD, fieldErrors: { categoryId: "Choose a category." } };
  if (!artist) return { ok: false, status: 400, error: BAD, fieldErrors: { artistId: "Choose an artist." } };
  const dupe = await prisma.nominee.findFirst({ where: { categoryId: d.categoryId, artistId: d.artistId, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (dupe) return { ok: false, status: 409, error: "This artist is already honored in this category.", fieldErrors: { artistId: "Already in this category." } };
  const slug = await honoreeSlug(d.slug, artist.slug, category.slug, category.edition.year, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };
  const nextOrder = d.sortOrder ?? ((await prisma.nominee.aggregate({ where: { categoryId: d.categoryId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  const data = {
    categoryId: d.categoryId,
    artistId: d.artistId,
    slug: slug.slug,
    // The artist's own name unless the admin overrides it (e.g. a band line-up name).
    displayNameEn: d.displayNameEn ?? artist.nameEn,
    displayNameAm: d.displayNameAm ?? artist.nameAm,
    workTitleEn: d.workTitleEn,
    workTitleAm: d.workTitleAm,
    imageId: d.imageId,
    blurbEn: d.blurbEn,
    blurbAm: d.blurbAm,
    youtubeUrl: d.youtubeUrl,
    sortOrder: nextOrder,
    status: d.status,
  };
  const saved = id ? await prisma.nominee.update({ where: { id }, data, select: { id: true } }) : await prisma.nominee.create({ data, select: { id: true } });
  invalidate([...TAGS_FOR.honoree(slug.slug, before?.slug), ...TAGS_FOR.awards(category.edition.slug), ...TAGS_FOR.artist(artist.slug)]);
  await logActivity({ userId: a.user.id, action: statusAction(before?.status, d.status, !id), entityType: "Nominee", entityId: saved.id, meta: { label: `${data.displayNameEn} · ${category.slug}` } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

/** Place several artists into a genre at once, as drafts (already-placed artists are skipped). */
export async function addArtistsToCategory(input: unknown): Promise<{ ok: true; added: number; skipped: number } | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const parsed = AddArtistsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  const { categoryId, artistIds } = parsed.data;
  const category = await prisma.awardCategory.findUnique({ where: { id: categoryId }, select: { slug: true, nameEn: true, edition: { select: { slug: true, year: true } } } });
  if (!category) return { ok: false, error: "Category not found." };
  const [artists, existing] = await Promise.all([
    prisma.artist.findMany({ where: { id: { in: artistIds } }, select: { id: true, slug: true, nameEn: true, nameAm: true }, orderBy: { nameEn: "asc" } }),
    prisma.nominee.findMany({ where: { categoryId }, select: { artistId: true } }),
  ]);
  const placed = new Set(existing.map((e) => e.artistId));
  const toAdd = artists.filter((x) => !placed.has(x.id));
  let order = (await prisma.nominee.aggregate({ where: { categoryId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0;
  for (const artist of toAdd) {
    const slug = await honoreeSlug(null, artist.slug, category.slug, category.edition.year);
    if ("error" in slug) continue;
    await prisma.nominee.create({ data: { categoryId, artistId: artist.id, slug: slug.slug, displayNameEn: artist.nameEn, displayNameAm: artist.nameAm, sortOrder: ++order, status: "DRAFT" } });
  }
  invalidate(TAGS_FOR.awards(category.edition.slug));
  if (toAdd.length) await logActivity({ userId: a.user.id, action: "create", entityType: "Nominee", meta: { label: `Added ${toAdd.length} artists to ${category.nameEn}`, count: toAdd.length } });
  return { ok: true, added: toAdd.length, skipped: artists.length - toAdd.length };
}

export async function reorderHonorees(input: unknown) {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids } = ReorderSchema.parse(input);
  await prisma.$transaction(ids.map((id, i) => prisma.nominee.update({ where: { id }, data: { sortOrder: i + 1 } })));
  invalidate(TAGS_FOR.awards());
  return { ok: true as const };
}

export async function bulkHonorees(input: unknown): Promise<BulkResult | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.nominee.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, displayNameEn: true } });
  if (op === "delete") await prisma.nominee.deleteMany({ where: { id: { in: ids } } });
  else await prisma.nominee.updateMany({ where: { id: { in: ids } }, data: { status: bulkStatus(op) } });
  invalidate([...TAGS_FOR.honoree(...rows.map((r) => r.slug)), ...TAGS_FOR.awards()]);
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "Nominee", entityId: r.id, meta: { label: r.displayNameEn } });
  return { ok: true, count: rows.length };
}

/* ───────────────────────── CSV import ───────────────────────── */

export type CsvPreviewRow = { line: number; values: Record<string, string>; categoryName: string | null; errors: string[] };
export type CsvPreview = { ok: true; rows: CsvPreviewRow[]; valid: number; invalid: number; unknownColumns: string[] } | { ok: false; error: string };

async function parseHonoreeCsv(editionId: string, csv: string) {
  if (csv.length > 1_000_000) return { error: "The file is too large (max 1 MB)." } as const;
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  if (!parsed.meta.fields?.includes("category") || !parsed.meta.fields.includes("artist")) return { error: `The first row must be a header with at least “category” and “artist”. Columns: ${CSV_COLUMNS.join(", ")}.` } as const;
  if (parsed.data.length > 500) return { error: "Import at most 500 honorees at a time." } as const;
  const [categories, artists, existing] = await Promise.all([
    prisma.awardCategory.findMany({ where: { editionId }, select: { id: true, slug: true, nameEn: true } }),
    prisma.artist.findMany({ select: { id: true, slug: true, nameEn: true, nameAm: true } }),
    prisma.nominee.findMany({ where: { category: { editionId } }, select: { categoryId: true, artistId: true } }),
  ]);
  const catBy = new Map<string, (typeof categories)[number]>();
  for (const c of categories) {
    catBy.set(c.slug.toLowerCase(), c);
    catBy.set(c.nameEn.toLowerCase(), c);
  }
  const artistBy = new Map(artists.map((x) => [x.slug, x]));
  const seen = new Set(existing.map((n) => `${n.categoryId}|${n.artistId}`));
  const rows = parsed.data.map((raw, i) => {
    const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (v ?? "").trim()]));
    const errors: string[] = [];
    const r = HonoreeCsvRow.safeParse(values);
    if (!r.success) errors.push(...r.error.issues.map((x) => `${String(x.path[0] ?? "row")}: ${x.message}`));
    const cat = catBy.get((values.category ?? "").toLowerCase());
    if (!cat) errors.push(`category: no category “${values.category}” in this edition`);
    const artist = artistBy.get(values.artist ?? "");
    if (!artist) errors.push(`artist: unknown artist slug “${values.artist}”`);
    if (cat && artist) {
      const key = `${cat.id}|${artist.id}`;
      if (seen.has(key)) errors.push("duplicate: this artist is already in the category (or appears twice in the file)");
      seen.add(key);
    }
    return { line: i + 2, values, categoryName: cat?.nameEn ?? null, errors, data: r.success && cat && artist ? { ...r.data, category: cat, artist } : null };
  });
  const known = new Set<string>(CSV_COLUMNS);
  return { rows, unknownColumns: parsed.meta.fields.filter((f) => !known.has(f)) } as const;
}

/** Step 1: validate the CSV and show what would be imported (nothing is saved). */
export async function previewHonoreeCsv(editionId: string, csv: string): Promise<CsvPreview> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const r = await parseHonoreeCsv(z.string().min(1).parse(editionId), z.string().parse(csv));
  if ("error" in r) return { ok: false, error: r.error! };
  const rows = r.rows.map(({ data: _data, ...row }) => row);
  return { ok: true, rows, valid: rows.filter((x) => !x.errors.length).length, invalid: rows.filter((x) => x.errors.length).length, unknownColumns: r.unknownColumns };
}

/** Step 2: re-validate on the server and import only if every row is valid (all or nothing). */
export async function importHonoreeCsv(editionId: string, csv: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const r = await parseHonoreeCsv(z.string().min(1).parse(editionId), z.string().parse(csv));
  if ("error" in r) return { ok: false, error: r.error! };
  const bad = r.rows.filter((x) => x.errors.length);
  if (bad.length) return { ok: false, error: `${bad.length} row${bad.length === 1 ? " has" : "s have"} errors. Fix the file and preview again.` };
  const edition = await prisma.awardEdition.findUnique({ where: { id: editionId }, select: { slug: true, year: true } });
  if (!edition) return { ok: false, error: "Edition not found." };
  let count = 0;
  await prisma.$transaction(async (tx) => {
    const order = new Map<string, number>();
    for (const row of r.rows) {
      const d = row.data!;
      const base = slugify(`${d.artist.slug} ${d.category.slug} ${edition.year}`) || "honoree";
      let slug = base;
      for (let n = 2; await tx.nominee.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
      const next = order.get(d.category.id) ?? ((await tx.nominee.aggregate({ where: { categoryId: d.category.id }, _max: { sortOrder: true } }))._max.sortOrder ?? 0);
      order.set(d.category.id, next + 1);
      await tx.nominee.create({
        data: {
          categoryId: d.category.id,
          artistId: d.artist.id,
          slug,
          displayNameEn: d.artist.nameEn,
          displayNameAm: d.artist.nameAm,
          workTitleEn: d.workTitleEn,
          workTitleAm: d.workTitleAm,
          blurbEn: d.blurbEn,
          blurbAm: d.blurbAm,
          youtubeUrl: d.youtubeUrl,
          status: d.status,
          sortOrder: next + 1,
        },
      });
      count++;
    }
  });
  invalidate(TAGS_FOR.awards(edition.slug));
  await logActivity({ userId: a.user.id, action: "create", entityType: "Nominee", meta: { label: `CSV import: ${count} honorees`, count } });
  return { ok: true, count };
}
