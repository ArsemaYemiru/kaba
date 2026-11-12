"use server";

import { z } from "zod";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";

export type AdminSearchHit = { kind: "Artist" | "Episode" | "Video" | "Album" | "News"; title: string; href: string; status: string };

/** Admin global search (top bar): titles/names across content, including drafts. */
export async function adminSearch(input: unknown): Promise<AdminSearchHit[]> {
  const a = await authorize();
  if (!a.ok) return [];
  const q = z.string().trim().min(2).max(80).safeParse(input);
  if (!q.success) return [];
  const c = { contains: q.data, mode: "insensitive" as const };
  const take = 6;
  const [artists, episodes, videos, albums, news] = await Promise.all([
    prisma.artist.findMany({ where: { OR: [{ nameEn: c }, { nameAm: c }, { stageName: c }] }, select: { id: true, nameEn: true, status: true }, take }),
    prisma.episode.findMany({ where: { OR: [{ titleEn: c }, { titleAm: c }] }, select: { id: true, titleEn: true, status: true }, take }),
    prisma.video.findMany({ where: { OR: [{ titleEn: c }, { titleAm: c }] }, select: { id: true, titleEn: true, status: true }, take }),
    prisma.album.findMany({ where: { OR: [{ titleEn: c }, { titleAm: c }] }, select: { id: true, titleEn: true, status: true }, take }),
    prisma.newsPost.findMany({ where: { OR: [{ titleEn: c }, { titleAm: c }] }, select: { id: true, titleEn: true, status: true }, take }),
  ]);
  return [
    ...artists.map((r) => ({ kind: "Artist" as const, title: r.nameEn, href: `/admin/artists/${r.id}`, status: r.status })),
    ...episodes.map((r) => ({ kind: "Episode" as const, title: r.titleEn, href: `/admin/episodes/${r.id}`, status: r.status })),
    ...videos.map((r) => ({ kind: "Video" as const, title: r.titleEn, href: `/admin/videos/${r.id}`, status: r.status })),
    ...albums.map((r) => ({ kind: "Album" as const, title: r.titleEn, href: `/admin/gallery/${r.id}`, status: r.status })),
    ...news.map((r) => ({ kind: "News" as const, title: r.titleEn, href: `/admin/news/${r.id}`, status: r.status })),
  ];
}
