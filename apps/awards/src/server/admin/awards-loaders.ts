import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { dateToAddisLocal } from "@/schemas/admin/common";

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });
const thumb = { select: { url: true, alt: true, blurDataUrl: true } } as const;
const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/* ───────── Editions ───────── */
export async function listEditionsAdmin() {
  return prisma.awardEdition.findMany({
    orderBy: { year: "desc" },
    select: {
      id: true,
      year: true,
      slug: true,
      nameEn: true,
      phase: true,
      status: true,
      isSample: true,
      votingOpensAt: true,
      votingClosesAt: true,
      ceremonyAt: true,
      updatedAt: true,
      _count: { select: { categories: true } },
    },
  });
}

export function getEditionForEdit(id: string) {
  return prisma.awardEdition.findUnique({ where: { id }, include: { _count: { select: { categories: { where: { status: "PUBLISHED" } } } } } });
}
type Edition = NonNullable<Awaited<ReturnType<typeof getEditionForEdit>>>;
export function editionToForm(e: Edition | null) {
  const year = new Date().getFullYear() + 1;
  return {
    year: s(e?.year ?? year),
    nameEn: e?.nameEn ?? `Feta Awards ${year}`,
    nameAm: s(e?.nameAm),
    slug: s(e?.slug),
    nomineesAnnouncedAt: dateToAddisLocal(e?.nomineesAnnouncedAt),
    votingOpensAt: dateToAddisLocal(e?.votingOpensAt),
    votingClosesAt: dateToAddisLocal(e?.votingClosesAt),
    ceremonyAt: dateToAddisLocal(e?.ceremonyAt),
    venue: s(e?.venue),
    broadcastPartner: s(e?.broadcastPartner),
    heroMediaId: e?.heroMediaId ?? null,
    showPublicPercentages: e?.showPublicPercentages ?? false,
    status: e?.status ?? ("DRAFT" as const),
  };
}

/* ───────── Categories ───────── */
export async function listCategoriesAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.AwardCategoryWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.edition ? { editionId: f.edition } : {}),
    ...(f.type ? { votingType: f.type as never } : {}),
    ...(p.q ? { OR: [{ nameEn: contains(p.q) }, { nameAm: contains(p.q) }, { slug: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.AwardCategoryOrderByWithRelationInput[] = p.sort === "name" ? [{ nameEn: p.dir }] : p.sort === "updated" ? [{ updatedAt: p.dir }] : [{ edition: { year: "desc" } }, { sortOrder: "asc" }];
  const [rows, total] = await Promise.all([
    prisma.awardCategory.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, nameEn: true, icon: true, votingType: true, status: true, isSample: true, sortOrder: true, updatedAt: true, edition: { select: { slug: true, year: true, phase: true } }, _count: { select: { nominees: true } } },
    }),
    prisma.awardCategory.count({ where }),
  ]);
  return { rows, total };
}

export function getCategoryForEdit(id: string) {
  return prisma.awardCategory.findUnique({ where: { id }, include: { _count: { select: { votes: true, nominees: true } } } });
}
type Category = NonNullable<Awaited<ReturnType<typeof getCategoryForEdit>>>;
export function categoryToForm(c: Category | null, editionId?: string) {
  return {
    editionId: c?.editionId ?? editionId ?? "",
    nameEn: s(c?.nameEn),
    nameAm: s(c?.nameAm),
    slug: s(c?.slug),
    descriptionEn: s(c?.descriptionEn),
    descriptionAm: s(c?.descriptionAm),
    icon: c?.icon ?? "trophy",
    votingType: c?.votingType ?? ("PUBLIC_VOTE" as const),
    publicWeight: s(c?.publicWeight ?? 50),
    juryWeight: s(c?.juryWeight ?? 50),
    nomineeType: c?.nomineeType ?? ("PERSON" as const),
    sortOrder: s(c?.sortOrder),
    status: c?.status ?? ("DRAFT" as const),
  };
}

/** Categories for selects: "Name · Year". */
export async function categoryOptions() {
  const rows = await prisma.awardCategory.findMany({
    orderBy: [{ edition: { year: "desc" } }, { sortOrder: "asc" }],
    select: { id: true, nameEn: true, votingType: true, nomineeType: true, edition: { select: { year: true } } },
  });
  return rows.map((c) => ({ id: c.id, label: `${c.nameEn} · ${c.edition.year}`, votingType: c.votingType, nomineeType: c.nomineeType }));
}

/* ───────── Nominees ───────── */
export async function listNomineesAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.NomineeWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.category ? { categoryId: f.category } : {}),
    ...(f.edition ? { category: { editionId: f.edition } } : {}),
    ...(f.winner === "1" ? { isWinner: true } : {}),
    ...(p.q ? { OR: [{ displayNameEn: contains(p.q) }, { displayNameAm: contains(p.q) }, { workTitleEn: contains(p.q) }, { slug: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.NomineeOrderByWithRelationInput[] =
    p.sort === "name" ? [{ displayNameEn: p.dir }] : p.sort === "updated" ? [{ updatedAt: p.dir }] : [{ category: { edition: { year: "desc" } } }, { category: { sortOrder: "asc" } }, { sortOrder: "asc" }];
  const [rows, total] = await Promise.all([
    prisma.nominee.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: {
        id: true,
        slug: true,
        displayNameEn: true,
        workTitleEn: true,
        status: true,
        isSample: true,
        isWinner: true,
        juryScore: true,
        updatedAt: true,
        image: thumb,
        category: { select: { nameEn: true, votingType: true, edition: { select: { year: true, phase: true } } } },
        _count: { select: { artists: true } },
      },
    }),
    prisma.nominee.count({ where }),
  ]);
  return { rows, total };
}

export function getNomineeForEdit(id: string) {
  return prisma.nominee.findUnique({ where: { id }, include: { artists: { select: { artistId: true } }, _count: { select: { votes: true } } } });
}
type Nominee = NonNullable<Awaited<ReturnType<typeof getNomineeForEdit>>>;
export function nomineeToForm(n: Nominee | null, categoryId?: string) {
  return {
    categoryId: n?.categoryId ?? categoryId ?? "",
    displayNameEn: s(n?.displayNameEn),
    displayNameAm: s(n?.displayNameAm),
    slug: s(n?.slug),
    workTitleEn: s(n?.workTitleEn),
    workTitleAm: s(n?.workTitleAm),
    artistIds: n?.artists.map((a) => a.artistId) ?? [],
    imageId: n?.imageId ?? null,
    blurbEn: s(n?.blurbEn),
    blurbAm: s(n?.blurbAm),
    youtubeUrl: s(n?.youtubeUrl),
    sortOrder: s(n?.sortOrder),
    status: n?.status ?? ("DRAFT" as const),
  };
}

/** Items for a drag-to-reorder list. */
export async function reorderItems(kind: "categories" | "nominees", parentId: string) {
  if (kind === "categories") {
    const rows = await prisma.awardCategory.findMany({ where: { editionId: parentId }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, status: true } });
    return rows.map((r) => ({ id: r.id, label: r.nameEn, status: r.status }));
  }
  const rows = await prisma.nominee.findMany({ where: { categoryId: parentId }, orderBy: { sortOrder: "asc" }, select: { id: true, displayNameEn: true, workTitleEn: true, status: true } });
  return rows.map((r) => ({ id: r.id, label: r.workTitleEn ? `${r.workTitleEn} · ${r.displayNameEn}` : r.displayNameEn, status: r.status }));
}
