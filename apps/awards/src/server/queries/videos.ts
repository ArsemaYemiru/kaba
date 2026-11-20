import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

export const VIDEO_TYPES = ["AWARDS_NIGHT", "RED_CARPET", "PERFORMANCE", "ACCEPTANCE_SPEECH", "INTERVIEW", "BEHIND_THE_SCENES"] as const;

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
  isSample: true,
  edition: { select: { slug: true, year: true, status: true } },
} satisfies Prisma.VideoSelect;

export type VideoCardData = Prisma.VideoGetPayload<{ select: typeof videoCardSelect }>;

export const VideoFiltersSchema = z.object({
  type: z.enum(VIDEO_TYPES).optional().catch(undefined),
  edition: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
});

const ORDER: Prisma.VideoOrderByWithRelationInput[] = [{ featured: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];

export async function listVideos(type?: (typeof VIDEO_TYPES)[number], edition?: string) {
  "use cache";
  cacheTag(TAGS.videos, TAGS.media);
  cacheLife("days");
  return prisma.video.findMany({
    where: { status: "PUBLISHED", ...(type ? { type } : {}), ...(edition ? { edition: { slug: edition, status: "PUBLISHED" } } : {}) },
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
    where: { status: "PUBLISHED", type: { in: ["AWARDS_NIGHT", "RED_CARPET", "PERFORMANCE", "ACCEPTANCE_SPEECH"] } },
    select: videoCardSelect,
    orderBy: ORDER,
    take,
  });
}

/** Videos linked to a nominee (nominee page). */
export async function honoreeVideos(nomineeId: string) {
  "use cache";
  cacheTag(TAGS.videos, TAGS.media);
  cacheLife("days");
  return prisma.video.findMany({ where: { status: "PUBLISHED", nominees: { some: { nomineeId } } }, select: videoCardSelect, orderBy: ORDER });
}
