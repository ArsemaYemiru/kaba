import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

export const VIDEO_TYPES = ["FULL_EPISODE", "HIGHLIGHT", "PERFORMANCE", "BEHIND_THE_SCENES", "INTERVIEW"] as const;

export const videoCardSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleAm: true,
  type: true,
  source: true,
  youtubeUrl: true,
  captionsUrl: true,
  media: { select: mediaSelect },
  poster: { select: mediaSelect },
  episode: { select: { slug: true, titleEn: true, status: true } },
} satisfies Prisma.VideoSelect;

export type VideoCardData = Prisma.VideoGetPayload<{ select: typeof videoCardSelect }>;

export const VideoFiltersSchema = z.object({ type: z.enum(VIDEO_TYPES).optional().catch(undefined) });

const ORDER: Prisma.VideoOrderByWithRelationInput[] = [{ featured: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];

export async function listVideos(type?: (typeof VIDEO_TYPES)[number]) {
  "use cache";
  cacheTag(TAGS.videos, TAGS.media);
  cacheLife("days");
  return prisma.video.findMany({
    where: { status: "PUBLISHED", ...(type ? { type } : {}) },
    select: videoCardSelect,
    orderBy: ORDER,
  });
}

/** Home "Highlights & performances". */
export async function highlightVideos(take = 6) {
  "use cache";
  cacheTag(TAGS.videos, TAGS.media);
  cacheLife("days");
  return prisma.video.findMany({
    where: { status: "PUBLISHED", type: { in: ["HIGHLIGHT", "PERFORMANCE"] } },
    select: videoCardSelect,
    orderBy: ORDER,
    take,
  });
}
