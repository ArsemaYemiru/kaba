import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { episodeCardSelect } from "./episodes";
import { mediaSelect } from "./media";

const published = { status: "PUBLISHED" } as const;

/** "Appeared on Feta" = an EpisodeParticipant row or a VideoArtist row (spec §7). */
const ON_FETA: Prisma.ArtistWhereInput = { OR: [{ appearances: { some: {} } }, { videos: { some: {} } }] };

export const CATEGORIES = ["SINGER", "MUSICIAN", "ACTOR", "COMEDIAN", "DANCER", "PRODUCER_DJ", "HOST_MEDIA"] as const;

export const artistCardSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  categories: true,
  isLegend: true,
  portrait: { select: mediaSelect },
  _count: { select: { appearances: true, videos: true } },
} satisfies Prisma.ArtistSelect;

export type ArtistCardData = Prisma.ArtistGetPayload<{ select: typeof artistCardSelect }>;
export const isOnFeta = (a: Pick<ArtistCardData, "_count">) => a._count.appearances + a._count.videos > 0;

export const ArtistFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  legends: z.literal("1").optional().catch(undefined),
  onFeta: z.literal("1").optional().catch(undefined),
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
  if (f.onFeta) and.push(ON_FETA);
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
  cacheTag(TAGS.artists, TAGS.artist(slug), TAGS.media, TAGS.videos, TAGS.episodes);
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
      appearances: {
        where: { episode: published },
        select: { episode: { select: episodeCardSelect } },
      },
    },
  });
  if (!artist) return null;
  const related = artist.categories.length
    ? await prisma.artist.findMany({
        where: { ...published, slug: { not: slug }, categories: { hasSome: artist.categories.filter((c) => c !== "OTHER") } },
        select: artistCardSelect,
        orderBy: [{ isLegend: "desc" }, { sortOrder: "asc" }],
        take: 4,
      })
    : [];
  return { ...artist, related };
}

export async function artistSlugs() {
  "use cache";
  cacheTag(TAGS.artists);
  cacheLife("days");
  return prisma.artist.findMany({ where: published, select: { slug: true, updatedAt: true } });
}
