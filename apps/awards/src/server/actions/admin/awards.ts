"use server";

import Papa from "papaparse";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { slugify } from "@/lib/slug";
import { CategorySchema, CSV_COLUMNS, EditionSchema, NomineeCsvRow, NomineeSchema, PhaseChangeSchema, ReorderSchema } from "@/schemas/admin/awards";
import { addisLocalToDate, fieldErrorsFrom, type SaveResult } from "@/schemas/admin/common";
import { BulkSchema, type BulkResult } from "@/server/admin/bulk-types";
import { checkPhaseChange } from "@/server/admin/phase";
import { activeSnapshot, winnersToPublish } from "@/server/admin/results";
import { resolveSlug } from "@/server/admin/slug";

const BAD = "Please fix the highlighted fields.";
const statusAction = (before: string | undefined, after: string, isNew: boolean) =>
  isNew ? "create" : before !== "PUBLISHED" && after === "PUBLISHED" ? "publish" : before === "PUBLISHED" && after !== "PUBLISHED" ? "unpublish" : "update";

/* ───────────────────────── Editions ───────────────────────── */

export async function saveEdition(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = EditionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: BAD, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.awardEdition.findUnique({ where: { id }, select: { status: true, slug: true, phase: true } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Edition not found." };
  const slug = d.slug ?? String(d.year);
  const clash = await prisma.awardEdition.findFirst({ where: { OR: [{ slug }, { year: d.year }], ...(id ? { NOT: { id } } : {}) }, select: { year: true, slug: true } });
  if (clash) return { ok: false, status: 409, error: "Another edition uses that year or slug.", fieldErrors: clash.year === d.year ? { year: "Another edition uses this year." } : { slug: "Another edition uses this slug." } };
  const opens = addisLocalToDate(d.votingOpensAt);
  const closes = addisLocalToDate(d.votingClosesAt);
  // While voting is open the window must stay valid (votes are checked against it).
  if (before?.phase === "VOTING_OPEN" && (!opens || !closes)) return { ok: false, status: 400, error: BAD, fieldErrors: { votingClosesAt: "Voting is open: both dates are required." } };
  const data = {
    year: d.year,
    slug,
    nameEn: d.nameEn,
    nameAm: d.nameAm,
    nomineesAnnouncedAt: addisLocalToDate(d.nomineesAnnouncedAt),
    votingOpensAt: opens,
    votingClosesAt: closes,
    ceremonyAt: addisLocalToDate(d.ceremonyAt),
    venue: d.venue,
    broadcastPartner: d.broadcastPartner,
    heroMediaId: d.heroMediaId,
    showPublicPercentages: d.showPublicPercentages,
    status: d.status,
  };
  const saved = id ? await prisma.awardEdition.update({ where: { id }, data, select: { id: true } }) : await prisma.awardEdition.create({ data, select: { id: true } });
  invalidate(TAGS_FOR.awards(slug, before?.slug));
  await logActivity({ userId: a.user.id, action: statusAction(before?.status, d.status, !id), entityType: "AwardEdition", entityId: saved.id, meta: { label: d.nameEn } });
  return { ok: true, id: saved.id, slug };
}

export async function changePhase(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const parsed = PhaseChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { editionId, to, reason } = parsed.data;
  // Publishing (or unpublishing) winners is a results permission: super admins only.
  const e = await prisma.awardEdition.findUnique({
    where: { id: editionId },
    select: { phase: true, slug: true, nameEn: true, votingOpensAt: true, votingClosesAt: true, _count: { select: { categories: { where: { status: "PUBLISHED" } } } } },
  });
  if (!e) return { ok: false, error: "Edition not found." };
  if ((to === "WINNERS_ANNOUNCED" || e.phase === "WINNERS_ANNOUNCED") && a.user.role !== "SUPER_ADMIN") return { ok: false, error: "Only a super admin can publish or unpublish winners." };
  const check = checkPhaseChange({
    from: e.phase,
    to,
    reason,
    votingOpensAt: e.votingOpensAt,
    votingClosesAt: e.votingClosesAt,
    hasLockedSnapshot: to === "WINNERS_ANNOUNCED" ? !!(await activeSnapshot(editionId)) : false,
    publishedCategories: e._count.categories,
  });
  if (!check.ok) return check;

  await prisma.$transaction(async (tx) => {
    await tx.awardEdition.update({ where: { id: editionId }, data: { phase: to } });
    if (to === "WINNERS_ANNOUNCED") {
      const w = await winnersToPublish(editionId);
      await tx.nominee.updateMany({ where: { category: { editionId } }, data: { isWinner: false } });
      if (w?.winners.length) await tx.nominee.updateMany({ where: { id: { in: w.winners } }, data: { isWinner: true } });
      if (w) await tx.resultSnapshot.update({ where: { id: w.snapshotId }, data: { publishedAt: new Date() } });
    }
    if (e.phase === "WINNERS_ANNOUNCED") {
      // Unpublishing winners hides them again; the locked snapshot itself never changes.
      await tx.nominee.updateMany({ where: { category: { editionId } }, data: { isWinner: false } });
      await tx.resultSnapshot.updateMany({ where: { editionId }, data: { publishedAt: null } });
    }
  });
  invalidate(TAGS_FOR.awards(e.slug));
  await logActivity({ userId: a.user.id, action: "phase_change", entityType: "AwardEdition", entityId: editionId, meta: { label: e.nameEn, from: e.phase, to, reason: reason ?? null, direction: check.direction } });
  return { ok: true };
}

export async function deleteEdition(id: string): Promise<BulkResult | { ok: false; error: string }> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return a;
  const e = await prisma.awardEdition.findUnique({ where: { id: z.string().min(1).parse(id) }, select: { nameEn: true, slug: true, _count: { select: { votes: true } } } });
  if (!e) return { ok: true, count: 0 };
  if (e._count.votes) return { ok: false, error: `This edition has ${e._count.votes} votes. Archive it instead (votes are kept for the record).` };
  await prisma.awardEdition.delete({ where: { id } });
  invalidate(TAGS_FOR.awards(e.slug));
  await logActivity({ userId: a.user.id, action: "delete", entityType: "AwardEdition", entityId: id, meta: { label: e.nameEn } });
  return { ok: true, count: 1 };
}

/* ───────────────────────── Categories ───────────────────────── */

export async function saveCategory(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: BAD, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.awardCategory.findUnique({ where: { id }, select: { status: true, editionId: true, votingType: true, _count: { select: { votes: true, nominees: true } } } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Category not found." };
  if (!(await prisma.awardEdition.findUnique({ where: { id: d.editionId }, select: { id: true } }))) return { ok: false, status: 400, error: BAD, fieldErrors: { editionId: "Choose an edition." } };
  if (before && before.editionId !== d.editionId && before._count.votes) return { ok: false, status: 409, error: "This category has votes, so it can't move to another edition.", fieldErrors: { editionId: "Has votes." } };
  if (before && before._count.votes && before.votingType !== d.votingType && (d.votingType === "JURY" || d.votingType === "HONORARY"))
    return { ok: false, status: 409, error: "This category has public votes; it can't become jury-only or honorary.", fieldErrors: { votingType: "Has public votes." } };
  if (d.votingType === "HONORARY" && (before?._count.nominees ?? 0) > 1) return { ok: false, status: 409, error: "Honorary categories have a single recipient. Remove the extra nominees first.", fieldErrors: { votingType: "Too many nominees." } };
  const base = d.slug ?? slugify(d.nameEn);
  const clash = await prisma.awardCategory.findFirst({ where: { editionId: d.editionId, slug: base, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash || base === "winners") return { ok: false, status: 409, error: "That slug is taken in this edition.", fieldErrors: { slug: clash ? "Already used in this edition." : "“winners” is reserved." } };
  const nextOrder = d.sortOrder ?? ((await prisma.awardCategory.aggregate({ where: { editionId: d.editionId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  const data = {
    editionId: d.editionId,
    nameEn: d.nameEn,
    nameAm: d.nameAm,
    slug: base,
    descriptionEn: d.descriptionEn,
    descriptionAm: d.descriptionAm,
    icon: d.icon,
    votingType: d.votingType,
    publicWeight: d.votingType === "HYBRID" ? d.publicWeight : d.votingType === "PUBLIC_VOTE" ? 100 : 0,
    juryWeight: d.votingType === "HYBRID" ? d.juryWeight : d.votingType === "PUBLIC_VOTE" ? 0 : 100,
    nomineeType: d.nomineeType,
    sortOrder: nextOrder,
    status: d.status,
  };
  const saved = id ? await prisma.awardCategory.update({ where: { id }, data, select: { id: true, edition: { select: { slug: true } } } }) : await prisma.awardCategory.create({ data, select: { id: true, edition: { select: { slug: true } } } });
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
  const rows = await prisma.awardCategory.findMany({ where: { id: { in: ids } }, select: { id: true, nameEn: true, _count: { select: { votes: true } } } });
  if (op === "delete") {
    const withVotes = rows.filter((r) => r._count.votes);
    if (withVotes.length) return { ok: false, error: `${withVotes.map((r) => r.nameEn).join(", ")} ${withVotes.length === 1 ? "has" : "have"} votes. Archive instead.` };
    await prisma.awardCategory.deleteMany({ where: { id: { in: ids } } });
  } else await prisma.awardCategory.updateMany({ where: { id: { in: ids } }, data: { status: op === "publish" ? "PUBLISHED" : op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate(TAGS_FOR.awards());
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "AwardCategory", entityId: r.id, meta: { label: r.nameEn } });
  return { ok: true, count: rows.length };
}

/* ───────────────────────── Nominees ───────────────────────── */

export async function saveNominee(id: string | null, input: unknown): Promise<SaveResult> {
  const a = await authorize();
  if (!a.ok) return a;
  const parsed = NomineeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: BAD, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  const before = id ? await prisma.nominee.findUnique({ where: { id }, select: { status: true, slug: true, categoryId: true, _count: { select: { votes: true } } } }) : null;
  if (id && !before) return { ok: false, status: 404, error: "Nominee not found." };
  if (before && before.categoryId !== d.categoryId && before._count.votes) return { ok: false, status: 409, error: "This nominee has votes, so it can't move to another category.", fieldErrors: { categoryId: "Has votes." } };
  const category = await prisma.awardCategory.findUnique({ where: { id: d.categoryId }, select: { votingType: true, edition: { select: { slug: true } }, _count: { select: { nominees: true } } } });
  if (!category) return { ok: false, status: 400, error: BAD, fieldErrors: { categoryId: "Choose a category." } };
  if (category.votingType === "HONORARY" && category._count.nominees >= 1 && before?.categoryId !== d.categoryId)
    return { ok: false, status: 409, error: "Honorary categories have a single recipient.", fieldErrors: { categoryId: "Already has a recipient." } };
  const slug = await resolveSlug("nominee", d.slug, d.workTitleEn ? `${d.workTitleEn} ${d.displayNameEn}` : d.displayNameEn, id ?? undefined);
  if ("error" in slug) return { ok: false, status: 409, error: slug.error, fieldErrors: { slug: slug.error } };
  const nextOrder = d.sortOrder ?? ((await prisma.nominee.aggregate({ where: { categoryId: d.categoryId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  const data = {
    categoryId: d.categoryId,
    slug: slug.slug,
    displayNameEn: d.displayNameEn,
    displayNameAm: d.displayNameAm,
    workTitleEn: d.workTitleEn,
    workTitleAm: d.workTitleAm,
    imageId: d.imageId,
    blurbEn: d.blurbEn,
    blurbAm: d.blurbAm,
    youtubeUrl: d.youtubeUrl,
    sortOrder: nextOrder,
    status: d.status,
  };
  const saved = await prisma.$transaction(async (tx) => {
    const row = id ? await tx.nominee.update({ where: { id }, data, select: { id: true } }) : await tx.nominee.create({ data, select: { id: true } });
    await tx.nomineeArtist.deleteMany({ where: { nomineeId: row.id } });
    if (d.artistIds.length) await tx.nomineeArtist.createMany({ data: d.artistIds.map((artistId) => ({ nomineeId: row.id, artistId })), skipDuplicates: true });
    return row;
  });
  invalidate([...TAGS_FOR.nominee(slug.slug, before?.slug), ...TAGS_FOR.awards(category.edition.slug)]);
  await logActivity({ userId: a.user.id, action: statusAction(before?.status, d.status, !id), entityType: "Nominee", entityId: saved.id, meta: { label: d.workTitleEn ?? d.displayNameEn } });
  return { ok: true, id: saved.id, slug: slug.slug };
}

export async function reorderNominees(input: unknown) {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids } = ReorderSchema.parse(input);
  await prisma.$transaction(ids.map((id, i) => prisma.nominee.update({ where: { id }, data: { sortOrder: i + 1 } })));
  invalidate(TAGS_FOR.awards());
  return { ok: true as const };
}

export async function bulkNominees(input: unknown): Promise<BulkResult | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return a;
  const { ids, op } = BulkSchema.parse(input);
  const rows = await prisma.nominee.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, displayNameEn: true, _count: { select: { votes: true } } } });
  if (op === "delete") {
    const withVotes = rows.filter((r) => r._count.votes);
    if (withVotes.length) return { ok: false, error: `${withVotes.length === 1 ? withVotes[0]!.displayNameEn + " has" : withVotes.length + " nominees have"} votes. Archive instead.` };
    await prisma.nominee.deleteMany({ where: { id: { in: ids } } });
  } else await prisma.nominee.updateMany({ where: { id: { in: ids } }, data: { status: op === "publish" ? "PUBLISHED" : op === "unpublish" ? "DRAFT" : "ARCHIVED" } });
  invalidate([...TAGS_FOR.nominee(...rows.map((r) => r.slug)), ...TAGS_FOR.awards()]);
  for (const r of rows) await logActivity({ userId: a.user.id, action: op === "archive" ? "unpublish" : op, entityType: "Nominee", entityId: r.id, meta: { label: r.displayNameEn } });
  return { ok: true, count: rows.length };
}

/* ───────────────────────── CSV import ───────────────────────── */

export type CsvPreviewRow = { line: number; values: Record<string, string>; categoryName: string | null; errors: string[] };
export type CsvPreview = { ok: true; rows: CsvPreviewRow[]; valid: number; invalid: number; unknownColumns: string[] } | { ok: false; error: string };

async function parseNomineeCsv(editionId: string, csv: string) {
  if (csv.length > 1_000_000) return { error: "The file is too large (max 1 MB)." } as const;
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  if (!parsed.meta.fields?.includes("category") || !parsed.meta.fields.includes("displayNameEn")) return { error: `The first row must be a header with at least “category” and “displayNameEn”. Columns: ${CSV_COLUMNS.join(", ")}.` } as const;
  if (parsed.data.length > 500) return { error: "Import at most 500 nominees at a time." } as const;
  const [categories, artists, existing] = await Promise.all([
    prisma.awardCategory.findMany({ where: { editionId }, select: { id: true, slug: true, nameEn: true, votingType: true, _count: { select: { nominees: true } } } }),
    prisma.artist.findMany({ select: { id: true, slug: true } }),
    prisma.nominee.findMany({ where: { category: { editionId } }, select: { categoryId: true, displayNameEn: true, workTitleEn: true } }),
  ]);
  const catBy = new Map<string, (typeof categories)[number]>();
  for (const c of categories) {
    catBy.set(c.slug.toLowerCase(), c);
    catBy.set(c.nameEn.toLowerCase(), c);
  }
  const artistBy = new Map(artists.map((x) => [x.slug, x.id]));
  const seen = new Set(existing.map((n) => `${n.categoryId}|${n.displayNameEn.toLowerCase()}|${(n.workTitleEn ?? "").toLowerCase()}`));
  const honoraryCount = new Map(categories.map((c) => [c.id, c._count.nominees]));
  const rows = parsed.data.map((raw, i) => {
    const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (v ?? "").trim()]));
    const errors: string[] = [];
    const r = NomineeCsvRow.safeParse(values);
    if (!r.success) errors.push(...r.error.issues.map((x) => `${String(x.path[0] ?? "row")}: ${x.message}`));
    const cat = catBy.get((values.category ?? "").toLowerCase());
    if (!cat) errors.push(`category: no category “${values.category}” in this edition`);
    const artistIds: string[] = [];
    for (const s of (values.artists ?? "").split(/[;|]/).map((x) => x.trim()).filter(Boolean)) {
      const idFor = artistBy.get(s);
      if (idFor) artistIds.push(idFor);
      else errors.push(`artists: unknown artist slug “${s}”`);
    }
    if (cat) {
      const key = `${cat.id}|${(values.displayNameEn ?? "").toLowerCase()}|${(values.workTitleEn ?? "").toLowerCase()}`;
      if (seen.has(key)) errors.push("duplicate: this nominee already exists in the category (or appears twice in the file)");
      seen.add(key);
      if (cat.votingType === "HONORARY") {
        const n = (honoraryCount.get(cat.id) ?? 0) + 1;
        honoraryCount.set(cat.id, n);
        if (n > 1) errors.push("category: honorary categories have a single recipient");
      }
    }
    return { line: i + 2, values, categoryName: cat?.nameEn ?? null, errors, data: r.success && cat ? { ...r.data, categoryId: cat.id, artistIds } : null };
  });
  const known = new Set<string>(CSV_COLUMNS);
  return { rows, unknownColumns: parsed.meta.fields.filter((f) => !known.has(f)) } as const;
}

/** Step 1: validate the CSV and show what would be imported (nothing is saved). */
export async function previewNomineeCsv(editionId: string, csv: string): Promise<CsvPreview> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const r = await parseNomineeCsv(z.string().min(1).parse(editionId), z.string().parse(csv));
  if ("error" in r) return { ok: false, error: r.error! };
  const rows = r.rows.map(({ data: _data, ...row }) => row);
  return { ok: true, rows, valid: rows.filter((x) => !x.errors.length).length, invalid: rows.filter((x) => x.errors.length).length, unknownColumns: r.unknownColumns };
}

/** Step 2: re-validate on the server and import only if every row is valid (all or nothing). */
export async function importNomineeCsv(editionId: string, csv: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const r = await parseNomineeCsv(z.string().min(1).parse(editionId), z.string().parse(csv));
  if ("error" in r) return { ok: false, error: r.error! };
  const bad = r.rows.filter((x) => x.errors.length);
  if (bad.length) return { ok: false, error: `${bad.length} row${bad.length === 1 ? " has" : "s have"} errors. Fix the file and preview again.` };
  const edition = await prisma.awardEdition.findUnique({ where: { id: editionId }, select: { slug: true } });
  let count = 0;
  await prisma.$transaction(async (tx) => {
    const order = new Map<string, number>();
    for (const row of r.rows) {
      const d = row.data!;
      const base = slugify(d.workTitleEn ? `${d.workTitleEn} ${d.displayNameEn}` : d.displayNameEn) || "nominee";
      let slug = base;
      for (let n = 2; await tx.nominee.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
      const next = order.get(d.categoryId) ?? ((await tx.nominee.aggregate({ where: { categoryId: d.categoryId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0);
      order.set(d.categoryId, next + 1);
      const created = await tx.nominee.create({
        data: {
          categoryId: d.categoryId,
          slug,
          displayNameEn: d.displayNameEn,
          displayNameAm: d.displayNameAm,
          workTitleEn: d.workTitleEn,
          workTitleAm: d.workTitleAm,
          blurbEn: d.blurbEn,
          blurbAm: d.blurbAm,
          youtubeUrl: d.youtubeUrl,
          status: d.status,
          sortOrder: next + 1,
        },
        select: { id: true },
      });
      if (d.artistIds.length) await tx.nomineeArtist.createMany({ data: d.artistIds.map((artistId) => ({ nomineeId: created.id, artistId })), skipDuplicates: true });
      count++;
    }
  });
  invalidate(TAGS_FOR.awards(edition?.slug));
  await logActivity({ userId: a.user.id, action: "create", entityType: "Nominee", meta: { label: `CSV import: ${count} nominees`, count } });
  return { ok: true, count };
}
