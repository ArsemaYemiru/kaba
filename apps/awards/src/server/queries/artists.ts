import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

const published = { status: "PUBLISHED" } as const;

/**
 * Nominations shown publicly: published nominee in a published category of a
 * published edition whose nominees have been announced (not DRAFT).
 */
const PUBLIC_NOMINATION: Prisma.NomineeWhereInput = {
  ...published,
  category: { ...published, edition: { ...published, phase: { not: "DRAFT" } } },
};
const NOMINATED: Prisma.ArtistWhereInput = { nominees: { some: { nominee: PUBLIC_NOMINATION } } };

export const CATEGORIES = ["SINGER", "MUSICIAN", "ACTOR", "COMEDIAN", "DANCER", "PRODUCER_DJ", "HOST_MEDIA"] as const;

export const artistCardSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  categories: true,
  isLegend: true,
  portrait: { select: mediaSelect },
  nominees: {
    where: { nominee: PUBLIC_NOMINATION },
    select: { nominee: { select: { isWinner: true, category: { select: { edition: { select: { phase: true } } } } } } },
  },
} satisfies Prisma.ArtistSelect;

export type ArtistCardData = Prisma.ArtistGetPayload<{ select: typeof artistCardSelect }>;
export const isNominee = (a: Pick<ArtistCardData, "nominees">) => a.nominees.length > 0;
/** A win counts only once that edition's winners are announced. */
export const isWinner = (a: Pick<ArtistCardData, "nominees">) =>
  a.nominees.some(({ nominee: n }) => n.isWinner && n.category.edition.phase === "WINNERS_ANNOUNCED");

export const ArtistFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  legends: z.literal("1").optional().catch(undefined),
  nominees: z.literal("1").optional().catch(undefined),
  sort: z.enum(["featured", "az", "za"]).default("featured").catch("featured"),
});
export type ArtistFilters = z.infer<typeof ArtistFiltersSchema>;

export async function listArtists(f: ArtistFilters) {
  "use cache";
  cacheTag(TAGS.artists, TAGS.media);
  cacheLife("days");
  const q = f.q || undefined;
  const and: Prisma.ArtistWhereInput[] = [published];
  if (q)
    and.push({
      OR: [
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameAm: { contains: q, mode: "insensitive" } },
        { stageName: { contains: q, mode: "insensitive" } },
        { legalNameEn: { contains: q, mode: "insensitive" } },
      ],
    });
  if (f.category) and.push({ categories: { has: f.category } });
  if (f.legends) and.push({ isLegend: true });
  if (f.nominees) and.push(NOMINATED);
  return prisma.artist.findMany({
    where: { AND: and },
    select: artistCardSelect,
    orderBy:
      f.sort === "az" ? [{ nameEn: "asc" }] : f.sort === "za" ? [{ nameEn: "desc" }] : [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

export async function legendArtists() {
  "use cache";
  cacheTag(TAGS.artists, TAGS.media);
  cacheLife("days");
  return prisma.artist.findMany({
    where: { ...published, isLegend: true },
    select: artistCardSelect,
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

/** Featured artists in the order set in Site Settings. */
export async function artistsByIds(ids: string[]) {
  "use cache";
  cacheTag(TAGS.artists, TAGS.media);
  cacheLife("days");
  if (ids.length === 0) return [];
  const rows = await prisma.artist.findMany({ where: { id: { in: ids }, ...published }, select: artistCardSelect });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is ArtistCardData => !!r);
}

export async function getArtist(slug: string) {
  "use cache";
  cacheTag(TAGS.artists, TAGS.artist(slug), TAGS.media, TAGS.videos, TAGS.editions);
  cacheLife("days");
  const artist = await prisma.artist.findFirst({
    where: { slug, ...published },
    select: {
      ...artistCardSelect,
      stageName: true,
      legalNameEn: true,
      legalNameAm: true,
      isGroup: true,
      shortBioEn: true,
      shortBioAm: true,
      bioEn: true,
      bioAm: true,
      birthYear: true,
      deathYear: true,
      yearsActive: true,
      genres: true,
      notableWorks: true,
      socialLinks: true,
      seoTitle: true,
      seoDescription: true,
      cover: { select: mediaSelect },
      gallery: { orderBy: { sortOrder: "asc" }, select: { media: { select: mediaSelect } } },
      videos: {
        where: { video: published },
        select: {
          video: {
            select: { slug: true, titleEn: true, titleAm: true, type: true, source: true, youtubeUrl: true, poster: { select: mediaSelect }, media: { select: mediaSelect } },
          },
        },
      },
      nominees: {
        where: { nominee: PUBLIC_NOMINATION },
        select: {
          nominee: {
            select: {
              slug: true,
              displayNameEn: true,
              workTitleEn: true,
              isWinner: true,
              isSample: true,
              category: { select: { slug: true, nameEn: true, nameAm: true, edition: { select: { slug: true, year: true, phase: true } } } },
            },
          },
        },
      },
    },
  });
  if (!artist) return null;
  const nominations = artist.nominees
    .map(({ nominee: n }) => ({ ...n, isWinner: n.isWinner && n.category.edition.phase === "WINNERS_ANNOUNCED" }))
    .sort((a, b) => b.category.edition.year - a.category.edition.year);
  const related = artist.categories.length
    ? await prisma.artist.findMany({
        where: { ...published, slug: { not: slug }, categories: { hasSome: artist.categories.filter((c) => c !== "OTHER") } },
        select: artistCardSelect,
        orderBy: [{ isLegend: "desc" }, { sortOrder: "asc" }],
        take: 4,
      })
    : [];
  return { ...artist, nominations, related };
}

export async function artistSlugs() {
  "use cache";
  cacheTag(TAGS.artists);
  cacheLife("days");
  return prisma.artist.findMany({ where: published, select: { slug: true, updatedAt: true } });
}
