import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

// Scheduled posts (PUBLISHED + future publishedAt) stay hidden until due (D-12),
// so news reads use a short cache life.
const live = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });

const cardSelect = {
  slug: true,
  titleEn: true,
  titleAm: true,
  excerptEn: true,
  excerptAm: true,
  publishedAt: true,
  tags: true,
  featured: true,
  cover: { select: mediaSelect },
} as const;

export async function listNews() {
  "use cache";
  cacheTag(TAGS.news, TAGS.media);
  cacheLife("minutes");
  return prisma.newsPost.findMany({ where: live(), select: cardSelect, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] });
}

export async function getNewsPost(slug: string) {
  "use cache";
  cacheTag(TAGS.news, TAGS.newsPost(slug), TAGS.media);
  cacheLife("minutes");
  return prisma.newsPost.findFirst({
    where: { slug, ...live() },
    select: { ...cardSelect, bodyEn: true, bodyAm: true, updatedAt: true, author: { select: { name: true } } },
  });
}

export async function newsSlugs() {
  "use cache";
  cacheTag(TAGS.news);
  cacheLife("minutes");
  return prisma.newsPost.findMany({ where: live(), select: { slug: true, updatedAt: true } });
}
