import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";

export type SearchItem = { kind: "episode" | "artist" | "news"; title: string; subtitle?: string; href: string; keywords: string[] };

/** Small index for the command palette (episodes, artists, news). */
export async function searchIndex(): Promise<SearchItem[]> {
  "use cache";
  cacheTag(TAGS.episodes, TAGS.artists, TAGS.news);
  cacheLife("minutes");
  const [episodes, artists, news] = await Promise.all([
    prisma.episode.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, titleEn: true, titleAm: true, season: true, participants: { select: { guestName: true, artist: { select: { nameEn: true } } } } },
      orderBy: { createdAt: "desc" },
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
    ...episodes.map((e) => ({
      kind: "episode" as const,
      title: e.titleEn,
      subtitle: e.season ? `Season ${e.season}` : undefined,
      href: `/episodes/${e.slug}`,
      keywords: [e.titleAm ?? "", ...e.participants.map((p) => p.artist?.nameEn ?? p.guestName ?? "")].filter(Boolean),
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
