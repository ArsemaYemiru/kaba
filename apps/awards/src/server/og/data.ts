import "server-only";
import { prisma } from "@/lib/db";

/** OG lookups: published rows only, same visibility rules as the pages (A-39/A-40). */
const published = { status: "PUBLISHED" } as const;
const mediaSel = { select: { storageKey: true, variants: true } } as const;

export function ogNominee(slug: string) {
  return prisma.nominee.findFirst({
    where: { slug, ...published, category: { ...published, edition: { ...published, phase: { not: "DRAFT" } } } },
    select: {
      displayNameEn: true,
      displayNameAm: true,
      workTitleEn: true,
      workTitleAm: true,
      isWinner: true,
      isSample: true,
      image: mediaSel,
      category: { select: { nameEn: true, votingType: true, edition: { select: { year: true, phase: true } } } },
    },
  });
}

export function ogCategory(edition: string, slug: string) {
  return prisma.awardCategory.findFirst({
    where: { slug, ...published, edition: { slug: edition, ...published, phase: { not: "DRAFT" } } },
    select: { nameEn: true, nameAm: true, votingType: true, isSample: true, edition: { select: { year: true, phase: true } } },
  });
}

export function ogEdition(slug: string) {
  return prisma.awardEdition.findFirst({ where: { slug, ...published }, select: { year: true, nameEn: true, nameAm: true, phase: true, isSample: true, heroMedia: mediaSel } });
}

export function ogArtist(slug: string) {
  return prisma.artist.findFirst({ where: { slug, ...published }, select: { nameEn: true, nameAm: true, isLegend: true, categories: true, portrait: mediaSel } });
}

export function ogNews(slug: string) {
  return prisma.newsPost.findFirst({ where: { slug, ...published, publishedAt: { lte: new Date() } }, select: { titleEn: true, titleAm: true, excerptEn: true, isSample: true, cover: mediaSel } });
}
