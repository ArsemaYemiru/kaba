import { cacheLife, cacheTag } from "next/cache";
import type { EditionPhase, Prisma } from "@/generated/prisma/client";
import { TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { mediaSelect } from "./media";
import { getSettings } from "./settings";

/**
 * Public awards reads. NEVER select vote counts here (spec §5.2, A-13):
 * tallies exist only in the admin/results code. Winner flags are masked
 * until the edition's winners are announced.
 */
const published = { status: "PUBLISHED" } as const;

export const editionSelect = {
  id: true,
  year: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  phase: true,
  nomineesAnnouncedAt: true,
  votingOpensAt: true,
  votingClosesAt: true,
  ceremonyAt: true,
  venue: true,
  broadcastPartner: true,
  showPublicPercentages: true,
  isSample: true,
  heroMedia: { select: mediaSelect },
} satisfies Prisma.AwardEditionSelect;
export type EditionData = Prisma.AwardEditionGetPayload<{ select: typeof editionSelect }>;

const nomineeSelect = {
  id: true,
  slug: true,
  displayNameEn: true,
  displayNameAm: true,
  workTitleEn: true,
  workTitleAm: true,
  blurbEn: true,
  blurbAm: true,
  youtubeUrl: true,
  isWinner: true,
  isSample: true,
  sortOrder: true,
  image: { select: mediaSelect },
} satisfies Prisma.NomineeSelect;
type NomineeRow = Prisma.NomineeGetPayload<{ select: typeof nomineeSelect }>;
export type NomineeData = Omit<NomineeRow, "isWinner"> & { isWinner: boolean };

const categorySelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  descriptionEn: true,
  descriptionAm: true,
  icon: true,
  votingType: true,
  publicWeight: true,
  juryWeight: true,
  nomineeType: true,
  sortOrder: true,
  isSample: true,
  _count: { select: { nominees: { where: published } } }, // nominee count, not votes
} satisfies Prisma.AwardCategorySelect;
export type CategoryData = Prisma.AwardCategoryGetPayload<{ select: typeof categorySelect }>;

const announced = (phase: EditionPhase) => phase === "WINNERS_ANNOUNCED";
const mask = (n: NomineeRow, phase: EditionPhase): NomineeData => ({ ...n, isWinner: announced(phase) && n.isWinner });

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
  cacheTag(TAGS.editions, TAGS.edition(slug), TAGS.media);
  cacheLife("days");
  const edition = await prisma.awardEdition.findFirst({ where: { slug, ...published }, select: editionSelect });
  if (!edition) return null;
  const categories = await prisma.awardCategory.findMany({ where: { editionId: edition.id, ...published }, orderBy: { sortOrder: "asc" }, select: categorySelect });
  return { edition, categories };
}

export async function listEditions() {
  "use cache";
  cacheTag(TAGS.editions);
  cacheLife("days");
  return prisma.awardEdition.findMany({ where: published, orderBy: { year: "desc" }, select: editionSelect });
}

export async function getCategory(editionSlug: string, categorySlug: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.edition(editionSlug), TAGS.media);
  cacheLife("days");
  const edition = await prisma.awardEdition.findFirst({ where: { slug: editionSlug, ...published }, select: editionSelect });
  if (!edition) return null;
  const category = await prisma.awardCategory.findFirst({
    where: { editionId: edition.id, slug: categorySlug, ...published },
    select: { ...categorySelect, nominees: { where: published, orderBy: { sortOrder: "asc" }, select: nomineeSelect } },
  });
  if (!category) return null;
  const { nominees, ...rest } = category;
  return { edition, category: rest, nominees: nominees.map((n) => mask(n, edition.phase)) };
}

/** Ballot: every public-vote category (PUBLIC_VOTE + HYBRID) with its nominees. */
export async function getBallot(editionId: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.media);
  cacheLife("days");
  const edition = await prisma.awardEdition.findFirst({ where: { id: editionId, ...published }, select: editionSelect });
  if (!edition) return null;
  const categories = await prisma.awardCategory.findMany({
    where: { editionId, ...published, votingType: { in: ["PUBLIC_VOTE", "HYBRID"] } },
    orderBy: { sortOrder: "asc" },
    select: { ...categorySelect, nominees: { where: published, orderBy: { sortOrder: "asc" }, select: nomineeSelect } },
  });
  return { edition, categories: categories.map((c) => ({ ...c, nominees: c.nominees.map((n) => mask(n, edition.phase)) })) };
}

export async function getNominee(slug: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.nominee(slug), TAGS.media, TAGS.artists);
  cacheLife("days");
  const row = await prisma.nominee.findFirst({
    where: { slug, ...published, category: { ...published, edition: published } },
    select: {
      ...nomineeSelect,
      artists: { where: { artist: published }, select: { artist: { select: { slug: true, nameEn: true, nameAm: true } } } },
      category: { select: { ...categorySelect, edition: { select: editionSelect } } },
    },
  });
  if (!row) return null;
  const { category, artists, ...nominee } = row;
  const { edition, ...cat } = category;
  return { nominee: mask({ ...nominee }, edition.phase), artists: artists.map((a) => a.artist), category: cat, edition };
}

/** Admin-selected featured nominees, in Site Settings order. */
export async function featuredNominees(ids: string[]) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.media, TAGS.settings);
  cacheLife("days");
  if (!ids.length) return [];
  const rows = await prisma.nominee.findMany({
    where: { id: { in: ids }, ...published, category: { ...published, edition: published } },
    select: { ...nomineeSelect, category: { select: { id: true, slug: true, nameEn: true, nomineeType: true, votingType: true, edition: { select: { id: true, slug: true, phase: true } } } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ ...mask(r, r.category.edition.phase), category: r.category }));
}

/**
 * Winners (only once announced). Percentages come from the published,
 * locked result snapshot, and only when the edition shows them.
 */
export async function getWinners(editionSlug: string) {
  "use cache";
  cacheTag(TAGS.editions, TAGS.edition(editionSlug), TAGS.media);
  cacheLife("days");
  const edition = await prisma.awardEdition.findFirst({ where: { slug: editionSlug, ...published }, select: editionSelect });
  if (!edition) return null;
  if (!announced(edition.phase)) return { edition, winners: [] };
  const [categories, snapshot] = await Promise.all([
    prisma.awardCategory.findMany({
      where: { editionId: edition.id, ...published },
      orderBy: { sortOrder: "asc" },
      select: { ...categorySelect, nominees: { where: { ...published, isWinner: true }, select: nomineeSelect } },
    }),
    edition.showPublicPercentages
      ? prisma.resultSnapshot.findFirst({ where: { editionId: edition.id, NOT: { publishedAt: null } }, orderBy: { lockedAt: "desc" }, select: { payload: true } })
      : null,
  ]);
  const shares = publicShares(snapshot?.payload);
  return {
    edition,
    winners: categories.flatMap((c) =>
      c.nominees.map((n) => ({
        category: c,
        nominee: mask(n, edition.phase),
        publicShare: c.votingType === "PUBLIC_VOTE" || c.votingType === "HYBRID" ? (shares.get(n.id) ?? null) : null,
      })),
    ),
  };
}

/** Reads `{ categories: [{ nominees: [{ id, publicShare }] }] }` from a snapshot payload. */
function publicShares(payload: unknown): Map<string, number> {
  const out = new Map<string, number>();
  const cats = (payload as { categories?: { nominees?: { id?: string; publicShare?: number }[] }[] } | null)?.categories ?? [];
  for (const c of cats) for (const n of c.nominees ?? []) if (n.id && typeof n.publicShare === "number") out.set(n.id, n.publicShare);
  return out;
}

export async function editionParams() {
  "use cache";
  cacheTag(TAGS.editions);
  cacheLife("days");
  const editions = await prisma.awardEdition.findMany({
    where: published,
    select: { slug: true, phase: true, updatedAt: true, categories: { where: published, select: { slug: true, updatedAt: true, nominees: { where: published, select: { slug: true, updatedAt: true } } } } },
  });
  return editions;
}
