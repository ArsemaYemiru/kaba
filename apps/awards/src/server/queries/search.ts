import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";

export type SearchItem = { kind: "honoree" | "artist" | "news"; title: string; subtitle?: string; href: string; keywords: string[] };

/** Small index for the command palette (honorees, artists, news). Published content only. */
export async function searchIndex(): Promise<SearchItem[]> {
  "use cache";
  cacheTag(TAGS.editions, TAGS.artists, TAGS.news);
  cacheLife("minutes");
  const [honorees, artists, news] = await Promise.all([
    prisma.nominee.findMany({
      where: { status: "PUBLISHED", artist: { status: "PUBLISHED" }, category: { status: "PUBLISHED", edition: { status: "PUBLISHED" } } },
      select: { slug: true, displayNameEn: true, displayNameAm: true, workTitleEn: true, category: { select: { nameEn: true, edition: { select: { year: true } } } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.artist.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, nameEn: true, nameAm: true, stageName: true, legalNameEn: true },
      orderBy: { nameEn: "asc" },
    }),
    prisma.newsPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      select: { slug: true, titleEn: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);
  return [
    ...honorees.map((n) => ({
      kind: "honoree" as const,
      title: n.displayNameEn,
      subtitle: `${n.category.nameEn} · ${n.category.edition.year}`,
      href: `/honorees/${n.slug}`,
      keywords: [n.displayNameAm ?? "", n.workTitleEn ?? "", n.category.nameEn].filter(Boolean),
    })),
    ...artists.map((a) => ({
      kind: "artist" as const,
      title: a.nameEn,
      subtitle: a.nameAm ?? undefined,
      href: `/artists/${a.slug}`,
      keywords: [a.nameAm, a.stageName, a.legalNameEn].filter((v): v is string => !!v),
    })),
    ...news.map((n) => ({ kind: "news" as const, title: n.titleEn, href: `/news/${n.slug}`, keywords: [] })),
  ];
}
