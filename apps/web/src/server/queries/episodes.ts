import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

const published = { status: "PUBLISHED" } as const;

export const episodeCardSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleAm: true,
  season: true,
  episodeNumber: true,
  type: true,
  airDate: true,
  thumbnail: { select: mediaSelect },
  participants: {
    orderBy: [{ side: "asc" }, { order: "asc" }],
    select: {
      side: true,
      guestName: true,
      artist: { select: { slug: true, nameEn: true, nameAm: true, status: true, portrait: { select: mediaSelect } } },
    },
  },
} satisfies Prisma.EpisodeSelect;

export type EpisodeCardData = Prisma.EpisodeGetPayload<{ select: typeof episodeCardSelect }>;

// Newest first: air date, then episode number, then creation order.
const NEWEST: Prisma.EpisodeOrderByWithRelationInput[] = [
  { airDate: { sort: "desc", nulls: "last" } },
  { season: { sort: "desc", nulls: "last" } },
  { episodeNumber: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
];
const OLDEST: Prisma.EpisodeOrderByWithRelationInput[] = [
  { airDate: { sort: "asc", nulls: "last" } },
  { season: { sort: "asc", nulls: "last" } },
  { episodeNumber: { sort: "asc", nulls: "last" } },
  { createdAt: "asc" },
];

export const EPISODES_PER_PAGE = 12;

export const EpisodeFiltersSchema = z.object({
  season: z.coerce.number().int().positive().optional().catch(undefined),
  type: z.enum(["GAME_SHOW", "HOLIDAY_SPECIAL", "PERFORMANCE", "BEHIND_THE_SCENES"]).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  sort: z.enum(["newest", "oldest"]).default("newest").catch("newest"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});
export type EpisodeFilters = z.infer<typeof EpisodeFiltersSchema>;

export async function listEpisodes(f: EpisodeFilters) {
  "use cache";
  cacheTag(TAGS.episodes);
  cacheLife("days");

  const q = f.q || undefined;
  const where: Prisma.EpisodeWhereInput = {
    ...published,
    ...(f.season ? { season: f.season } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(q
      ? {
          OR: [
            { titleEn: { contains: q, mode: "insensitive" } },
            { titleAm: { contains: q, mode: "insensitive" } },
            {
              participants: {
                some: {
                  OR: [
                    { guestName: { contains: q, mode: "insensitive" } },
                    { artist: { nameEn: { contains: q, mode: "insensitive" } } },
                    { artist: { nameAm: { contains: q, mode: "insensitive" } } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
  const [items, total, seasons] = await Promise.all([
    prisma.episode.findMany({
      where,
      select: episodeCardSelect,
      orderBy: f.sort === "oldest" ? OLDEST : NEWEST,
      skip: (f.page - 1) * EPISODES_PER_PAGE,
      take: EPISODES_PER_PAGE,
    }),
    prisma.episode.count({ where }),
    prisma.episode.findMany({
      where: { ...published, season: { not: null } },
      distinct: ["season"],
      select: { season: true },
      orderBy: { season: "asc" },
    }),
  ]);
  return {
    items,
    total,
    pages: Math.max(1, Math.ceil(total / EPISODES_PER_PAGE)),
    seasons: seasons.map((s) => s.season!).filter(Boolean),
  };
}

export async function latestEpisodes(take = 8) {
  "use cache";
  cacheTag(TAGS.episodes);
  cacheLife("days");
  return prisma.episode.findMany({ where: published, select: episodeCardSelect, orderBy: NEWEST, take });
}

export async function getEpisodeCard(id: string | null | undefined) {
  "use cache";
  cacheTag(TAGS.episodes);
  cacheLife("days");
  if (!id) return null;
  return prisma.episode.findFirst({ where: { id, ...published }, select: episodeCardSelect });
}

export async function getEpisode(slug: string) {
  "use cache";
  cacheTag(TAGS.episodes, TAGS.episode(slug), TAGS.media, TAGS.videos, TAGS.albums);
  cacheLife("days");
  return prisma.episode.findFirst({
    where: { slug, ...published },
    select: {
      ...episodeCardSelect,
      descriptionEn: true,
      descriptionAm: true,
      videoSource: true,
      youtubeUrl: true,
      videoMedia: { select: mediaSelect },
      winnerSide: true,
      isTie: true,
      rounds: { orderBy: { order: "asc" }, select: { nameEn: true, nameAm: true, scoreA: true, scoreB: true } },
      gallery: { orderBy: { sortOrder: "asc" }, select: { media: { select: mediaSelect } } },
      albums: {
        where: published,
        select: { items: { orderBy: { sortOrder: "asc" }, select: { caption: true, media: { select: mediaSelect } } } },
      },
      videos: {
        where: published,
        orderBy: { publishedAt: "desc" },
        select: { slug: true, titleEn: true, type: true },
      },
    },
  });
}

export async function moreEpisodes(excludeSlug: string, take = 4) {
  "use cache";
  cacheTag(TAGS.episodes);
  cacheLife("days");
  return prisma.episode.findMany({
    where: { ...published, slug: { not: excludeSlug } },
    select: episodeCardSelect,
    orderBy: NEWEST,
    take,
  });
}

export async function episodeSlugs() {
  "use cache";
  cacheTag(TAGS.episodes);
  cacheLife("days");
  return prisma.episode.findMany({ where: published, select: { slug: true, updatedAt: true } });
}
