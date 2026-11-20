import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { mediaSelect } from "./media";
import { getSettings } from "./settings";

/**
 * Public awards reads (A-76). An edition has genre categories; each honoree
 * entry recognizes one published artist with a citation and an optional
 * featured work. Everyone in a category is honored equally (no winners).
 */
const published = { status: "PUBLISHED" } as const;
/** An honoree is public when it, its genre, its edition and its artist are published. */
const publicHonoree = { ...published, artist: published } as const;

export const editionSelect = {
  id: true,
  year: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  ceremonyAt: true,
  venue: true,
  broadcastPartner: true,
  isSample: true,
  updatedAt: true,
  heroMedia: { select: mediaSelect },
} satisfies Prisma.AwardEditionSelect;
export type EditionData = Prisma.AwardEditionGetPayload<{ select: typeof editionSelect }>;

export const honoreeSelect = {
  id: true,
  slug: true,
  displayNameEn: true,
  displayNameAm: true,
  workTitleEn: true,
  workTitleAm: true,
  blurbEn: true,
  blurbAm: true,
  youtubeUrl: true,
  isSample: true,
  sortOrder: true,
  image: { select: mediaSelect },
  artist: { select: { id: true, slug: true, nameEn: true, nameAm: true, isLegend: true, isGroup: true, categories: true, portrait: { select: mediaSelect } } },
} satisfies Prisma.NomineeSelect;
export type HonoreeData = Prisma.NomineeGetPayload<{ select: typeof honoreeSelect }>;

const categorySelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  descriptionEn: true,
  descriptionAm: true,
  icon: true,
  sortOrder: true,
  isSample: true,
  _count: { select: { nominees: { where: publicHonoree } } },
} satisfies Prisma.AwardCategorySelect;
export type CategoryData = Prisma.AwardCategoryGetPayload<{ select: typeof categorySelect }>;

/** The edition shown on the home page: Site Settings' current edition, else the latest published one. */
export async function getCurrentEdition(): Promise<EditionData | null> {
  "use cache";
  cacheTag(TAGS.editions, TAGS.settings, TAGS.media);
  cacheLife("days");
  const settings = await getSettings();
  const byId = settings.currentEditionId ? await prisma.awardEdition.findFirst({ where: { id: settings.currentEditionId, ...published }, select: editionSelect }) : null;
  return byId ?? (await prisma.awardEdition.findFirst({ where: published, orderBy: { year: "desc" }, select: editionSelect }));
}

export async function getEdition(slug: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.edition(slug), TAGS.media, TAGS.artists);
  cacheLife("days");
  const edition = await prisma.awardEdition.findFirst({ where: { slug, ...published }, select: editionSelect });
  if (!edition) return null;
  const categories = await prisma.awardCategory.findMany({ where: { editionId: edition.id, ...published }, orderBy: { sortOrder: "asc" }, select: categorySelect });
  const honorees = await prisma.nominee.count({ where: { ...publicHonoree, category: { editionId: edition.id, ...published } } });
  return { edition, categories, honorees };
}

export async function listEditions() {
  "use cache";
  cacheTag(TAGS.editions);
  cacheLife("days");
  return prisma.awardEdition.findMany({ where: published, orderBy: { year: "desc" }, select: editionSelect });
}

export async function getCategory(editionSlug: string, categorySlug: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.edition(editionSlug), TAGS.media, TAGS.artists);
  cacheLife("days");
  const edition = await prisma.awardEdition.findFirst({ where: { slug: editionSlug, ...published }, select: editionSelect });
  if (!edition) return null;
  const category = await prisma.awardCategory.findFirst({
    where: { editionId: edition.id, slug: categorySlug, ...published },
    select: { ...categorySelect, nominees: { where: publicHonoree, orderBy: [{ sortOrder: "asc" }, { displayNameEn: "asc" }], select: honoreeSelect } },
  });
  if (!category) return null;
  const { nominees, ...rest } = category;
  return { edition, category: rest, honorees: nominees };
}

export async function getHonoree(slug: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.honoree(slug), TAGS.media, TAGS.artists);
  cacheLife("days");
  const row = await prisma.nominee.findFirst({
    where: { slug, ...publicHonoree, category: { ...published, edition: published } },
    select: { ...honoreeSelect, category: { select: { ...categorySelect, edition: { select: editionSelect } } } },
  });
  if (!row) return null;
  const { category, ...honoree } = row;
  const { edition, ...cat } = category;
  return { honoree, category: cat, edition };
}

/** Admin-selected featured honorees, in Site Settings order. */
export async function featuredHonorees(ids: string[]) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.media, TAGS.settings, TAGS.artists);
  cacheLife("days");
  if (!ids.length) return [];
  const rows = await prisma.nominee.findMany({
    where: { id: { in: ids }, ...publicHonoree, category: { ...published, edition: published } },
    select: { ...honoreeSelect, category: { select: { id: true, slug: true, nameEn: true, nameAm: true, edition: { select: { id: true, slug: true, year: true } } } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
}

/** Every public recognition of one artist, newest edition first (artist profile "Recognized in"). */
export async function artistRecognitions(artistId: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.artists);
  cacheLife("days");
  return prisma.nominee.findMany({
    where: { artistId, ...published, category: { ...published, edition: published } },
    orderBy: [{ category: { edition: { year: "desc" } } }, { category: { sortOrder: "asc" } }],
    select: {
      slug: true,
      workTitleEn: true,
      workTitleAm: true,
      blurbEn: true,
      blurbAm: true,
      category: { select: { slug: true, nameEn: true, nameAm: true, edition: { select: { slug: true, year: true, nameEn: true } } } },
    },
  });
}

export async function editionParams() {
  "use cache";
  cacheTag(TAGS.editions);
  cacheLife("days");
  return prisma.awardEdition.findMany({
    where: published,
    select: { slug: true, updatedAt: true, categories: { where: published, select: { slug: true, updatedAt: true, nominees: { where: publicHonoree, select: { slug: true, updatedAt: true } } } } },
  });
}
