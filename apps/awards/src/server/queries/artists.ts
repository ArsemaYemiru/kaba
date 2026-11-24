import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

const published = { status: "PUBLISHED" } as const;

/** Recognitions shown publicly: a published honoree entry in a published genre of an announced edition (A-76). */
const PUBLIC_HONOR: Prisma.NomineeWhereInput = { ...published, category: { ...published, edition: published } };
const HONORED: Prisma.ArtistWhereInput = { honors: { some: PUBLIC_HONOR } };

export const CATEGORIES = ["SINGER", "MUSICIAN", "ACTOR", "COMEDIAN", "DANCER", "PRODUCER_DJ", "HOST_MEDIA"] as const;

export const artistCardSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  categories: true,
  isLegend: true,
  portrait: { select: mediaSelect },
  _count: { select: { honors: { where: PUBLIC_HONOR } } },
} satisfies Prisma.ArtistSelect;

export type ArtistCardData = Prisma.ArtistGetPayload<{ select: typeof artistCardSelect }>;
/** Recognized in at least one announced Feta Awards edition. */
export const isHonored = (a: Pick<ArtistCardData, "_count">) => a._count.honors > 0;

export const ArtistFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  legends: z.literal("1").optional().catch(undefined),
  honored: z.literal("1").optional().catch(undefined),
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
  if (f.honored) and.push(HONORED);
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
      honors: {
        where: PUBLIC_HONOR,
        orderBy: [{ category: { edition: { year: "desc" } } }, { category: { sortOrder: "asc" } }],
        select: {
          slug: true,
          workTitleEn: true,
          workTitleAm: true,
          blurbEn: true,
          blurbAm: true,
          category: { select: { slug: true, nameEn: true, nameAm: true, edition: { select: { slug: true, year: true, nameEn: true } } } },
        },
      },
    },
  });
  if (!artist) return null;
  const { honors: recognitions, ...rest } = artist;
  const related = artist.categories.length
    ? await prisma.artist.findMany({
        where: { ...published, slug: { not: slug }, categories: { hasSome: artist.categories.filter((c) => c !== "OTHER") } },
        select: artistCardSelect,
        orderBy: [{ isLegend: "desc" }, { sortOrder: "asc" }],
        take: 4,
      })
    : [];
  return { ...rest, recognitions, related };
}

export async function artistSlugs() {
  "use cache";
  cacheTag(TAGS.artists);
  cacheLife("days");
  return prisma.artist.findMany({ where: published, select: { slug: true, updatedAt: true } });
}
