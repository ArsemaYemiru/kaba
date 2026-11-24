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
      status: true,
      ceremonyAt: true,
      updatedAt: true,
      _count: { select: { categories: true } },
    },
  });
}

export function getEditionForEdit(id: string) {
  return prisma.awardEdition.findUnique({ where: { id }, include: { _count: { select: { categories: true } } } });
}
type Edition = NonNullable<Awaited<ReturnType<typeof getEditionForEdit>>>;
export function editionToForm(e: Edition | null) {
  const year = new Date().getFullYear() + 1;
  return {
    year: s(e?.year ?? year),
    nameEn: e?.nameEn ?? `Feta Awards ${year}`,
    nameAm: s(e?.nameAm),
    slug: s(e?.slug),
    ceremonyAt: dateToAddisLocal(e?.ceremonyAt),
    venue: s(e?.venue),
    broadcastPartner: s(e?.broadcastPartner),
    heroMediaId: e?.heroMediaId ?? null,
    status: e?.status ?? ("DRAFT" as const),
  };
}

/* ───────── Categories ───────── */
export async function listCategoriesAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.AwardCategoryWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.edition ? { editionId: f.edition } : {}),
    ...(p.q ? { OR: [{ nameEn: contains(p.q) }, { nameAm: contains(p.q) }, { slug: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.AwardCategoryOrderByWithRelationInput[] = p.sort === "name" ? [{ nameEn: p.dir }] : p.sort === "updated" ? [{ updatedAt: p.dir }] : [{ edition: { year: "desc" } }, { sortOrder: "asc" }];
  const [rows, total] = await Promise.all([
    prisma.awardCategory.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, nameEn: true, icon: true, status: true, sortOrder: true, updatedAt: true, edition: { select: { slug: true, year: true, status: true } }, _count: { select: { nominees: true } } },
    }),
    prisma.awardCategory.count({ where }),
  ]);
  return { rows, total };
}

export function getCategoryForEdit(id: string) {
  return prisma.awardCategory.findUnique({ where: { id }, include: { edition: { select: { slug: true, status: true } }, nominees: { select: { artistId: true } }, _count: { select: { nominees: true } } } });
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
    sortOrder: s(c?.sortOrder),
    status: c?.status ?? ("DRAFT" as const),
  };
}

/** Categories for selects: "Name · Year". */
export async function categoryOptions() {
  const rows = await prisma.awardCategory.findMany({
    orderBy: [{ edition: { year: "desc" } }, { sortOrder: "asc" }],
    select: { id: true, nameEn: true, edition: { select: { year: true } } },
  });
  return rows.map((c) => ({ id: c.id, label: `${c.nameEn} · ${c.edition.year}` }));
}

/* ───────── Honorees ───────── */
export async function listHonoreesAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.NomineeWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.category ? { categoryId: f.category } : {}),
    ...(f.edition ? { category: { editionId: f.edition } } : {}),
    ...(f.artist ? { artistId: f.artist } : {}),
    ...(p.q ? { OR: [{ displayNameEn: contains(p.q) }, { displayNameAm: contains(p.q) }, { workTitleEn: contains(p.q) }, { slug: contains(p.q) }, { artist: { nameEn: contains(p.q) } }] } : {}),
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
        updatedAt: true,
        image: thumb,
        blurbEn: true,
        artist: { select: { nameEn: true, status: true, portrait: thumb } },
        category: { select: { nameEn: true, edition: { select: { year: true } } } },
      },
    }),
    prisma.nominee.count({ where }),
  ]);
  return { rows, total };
}

export function getHonoreeForEdit(id: string) {
  return prisma.nominee.findUnique({
    where: { id },
    include: { artist: { select: { nameEn: true, nameAm: true, status: true } }, category: { select: { status: true, edition: { select: { status: true } } } } },
  });
}
type Honoree = NonNullable<Awaited<ReturnType<typeof getHonoreeForEdit>>>;
/** Display names equal to the artist's own show as empty ("use the artist's name"). */
export function honoreeToForm(n: Honoree | null, categoryId?: string, artistId?: string) {
  return {
    categoryId: n?.categoryId ?? categoryId ?? "",
    artistId: n?.artistId ?? artistId ?? "",
    displayNameEn: n && n.displayNameEn !== n.artist.nameEn ? n.displayNameEn : "",
    displayNameAm: n && n.displayNameAm !== n.artist.nameAm ? s(n.displayNameAm) : "",
    slug: s(n?.slug),
    workTitleEn: s(n?.workTitleEn),
    workTitleAm: s(n?.workTitleAm),
    imageId: n?.imageId ?? null,
    blurbEn: s(n?.blurbEn),
    blurbAm: s(n?.blurbAm),
    youtubeUrl: s(n?.youtubeUrl),
    sortOrder: s(n?.sortOrder),
    status: n?.status ?? ("DRAFT" as const),
  };
}

/** Items for a drag-to-reorder list. */
export async function reorderItems(kind: "categories" | "honorees", parentId: string) {
  if (kind === "categories") {
    const rows = await prisma.awardCategory.findMany({ where: { editionId: parentId }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, status: true } });
    return rows.map((r) => ({ id: r.id, label: r.nameEn, status: r.status }));
  }
  const rows = await prisma.nominee.findMany({ where: { categoryId: parentId }, orderBy: { sortOrder: "asc" }, select: { id: true, displayNameEn: true, status: true } });
  return rows.map((r) => ({ id: r.id, label: r.displayNameEn, status: r.status }));
}
