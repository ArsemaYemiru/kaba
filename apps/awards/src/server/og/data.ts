import "server-only";
import { prisma } from "@/lib/db";

/** OG lookups: published rows only, same visibility rules as the pages (A-39/A-40). */
const published = { status: "PUBLISHED" } as const;
const mediaSel = { select: { storageKey: true, variants: true } } as const;

export function ogHonoree(slug: string) {
  return prisma.nominee.findFirst({
    where: { slug, ...published, artist: published, category: { ...published, edition: published } },
    select: {
      displayNameEn: true,
      displayNameAm: true,
      workTitleEn: true,
      image: mediaSel,
      artist: { select: { portrait: mediaSel } },
      category: { select: { nameEn: true, edition: { select: { year: true } } } },
    },
  });
}

export function ogCategory(edition: string, slug: string) {
  return prisma.awardCategory.findFirst({
    where: { slug, ...published, edition: { slug: edition, ...published } },
    select: { nameEn: true, nameAm: true, edition: { select: { year: true } }, _count: { select: { nominees: { where: { ...published, artist: published } } } } },
  });
}

export function ogEdition(slug: string) {
  return prisma.awardEdition.findFirst({ where: { slug, ...published }, select: { year: true, nameEn: true, nameAm: true, heroMedia: mediaSel, _count: { select: { categories: { where: published } } } } });
}

export function ogArtist(slug: string) {
  return prisma.artist.findFirst({ where: { slug, ...published }, select: { nameEn: true, nameAm: true, isLegend: true, categories: true, portrait: mediaSel } });
}

export function ogNews(slug: string) {
  return prisma.newsPost.findFirst({ where: { slug, ...published, publishedAt: { lte: new Date() } }, select: { titleEn: true, titleAm: true, excerptEn: true, cover: mediaSel } });
}
