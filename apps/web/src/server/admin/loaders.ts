import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { mediaSelect } from "@/server/queries/media";

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });
const thumb = { select: { url: true, alt: true, blurDataUrl: true } } as const;

/* ───────── Lists ───────── */

export async function listArtistsAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.ArtistWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.category ? { categories: { has: f.category as never } } : {}),
    ...(f.legend === "1" ? { isLegend: true } : {}),
    ...(f.featured === "1" ? { featured: true } : {}),
    ...(p.q ? { OR: [{ nameEn: contains(p.q) }, { nameAm: contains(p.q) }, { stageName: contains(p.q) }, { slug: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.ArtistOrderByWithRelationInput = p.sort === "name" ? { nameEn: p.dir } : p.sort === "order" ? { sortOrder: p.dir } : { updatedAt: p.dir };
  const [rows, total] = await Promise.all([
    prisma.artist.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, nameEn: true, nameAm: true, categories: true, isLegend: true, featured: true, status: true, updatedAt: true, portrait: thumb },
    }),
    prisma.artist.count({ where }),
  ]);
  return { rows, total };
}

export async function listEpisodesAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.EpisodeWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.type ? { type: f.type as never } : {}),
    ...(f.season ? { season: Number(f.season) || undefined } : {}),
    ...(f.video === "none" ? { videoSource: "NONE" } : {}),
    ...(p.q
      ? { OR: [{ titleEn: contains(p.q) }, { titleAm: contains(p.q) }, { participants: { some: { OR: [{ guestName: contains(p.q) }, { artist: { nameEn: contains(p.q) } }] } } }] }
      : {}),
  };
  const orderBy: Prisma.EpisodeOrderByWithRelationInput[] =
    p.sort === "title" ? [{ titleEn: p.dir }] : p.sort === "airDate" ? [{ airDate: { sort: p.dir, nulls: "last" } }] : [{ updatedAt: p.dir }];
  const [rows, total] = await Promise.all([
    prisma.episode.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, titleEn: true, type: true, season: true, episodeNumber: true, airDate: true, videoSource: true, featured: true, status: true, updatedAt: true },
    }),
    prisma.episode.count({ where }),
  ]);
  return { rows, total };
}

export async function listVideosAdmin(p: ListParams) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.VideoWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(f.type ? { type: f.type as never } : {}),
    ...(f.source ? { source: f.source as never } : {}),
    ...(p.q ? { OR: [{ titleEn: contains(p.q) }, { titleAm: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.VideoOrderByWithRelationInput = p.sort === "title" ? { titleEn: p.dir } : p.sort === "published" ? { publishedAt: { sort: p.dir, nulls: "last" } } : { updatedAt: p.dir };
  const [rows, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, titleEn: true, type: true, source: true, featured: true, status: true, publishedAt: true, updatedAt: true, poster: thumb, episode: { select: { titleEn: true } } },
    }),
    prisma.video.count({ where }),
  ]);
  return { rows, total };
}

export async function listAlbumsAdmin(p: ListParams) {
  const where: Prisma.AlbumWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(p.q ? { OR: [{ titleEn: contains(p.q) }, { titleAm: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.AlbumOrderByWithRelationInput = p.sort === "title" ? { titleEn: p.dir } : { updatedAt: p.dir };
  const [rows, total] = await Promise.all([
    prisma.album.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, titleEn: true, status: true, isSample: true, updatedAt: true, cover: thumb, _count: { select: { items: true } } },
    }),
    prisma.album.count({ where }),
  ]);
  return { rows, total };
}

export async function listNewsAdmin(p: ListParams) {
  const where: Prisma.NewsPostWhereInput = {
    ...(p.status ? { status: p.status } : {}),
    ...(p.q ? { OR: [{ titleEn: contains(p.q) }, { titleAm: contains(p.q) }, { tags: { has: p.q } }] } : {}),
  };
  const orderBy: Prisma.NewsPostOrderByWithRelationInput = p.sort === "title" ? { titleEn: p.dir } : p.sort === "published" ? { publishedAt: { sort: p.dir, nulls: "last" } } : { updatedAt: p.dir };
  const [rows, total] = await Promise.all([
    prisma.newsPost.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: { id: true, slug: true, titleEn: true, status: true, featured: true, isSample: true, publishedAt: true, updatedAt: true, tags: true, cover: thumb, author: { select: { name: true } } },
    }),
    prisma.newsPost.count({ where }),
  ]);
  return { rows, total };
}

/* ───────── Option lists for pickers ───────── */

export async function artistOptions() {
  return prisma.artist.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, status: true } });
}
export async function episodeOptions() {
  return prisma.episode.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, titleEn: true, status: true } });
}
export async function videoOptions() {
  return prisma.video.findMany({ orderBy: { titleEn: "asc" }, select: { id: true, titleEn: true, status: true } });
}

/** Media rows for ids (keeps the given order). */
export async function mediaByIds(ids: (string | null | undefined)[]) {
  const list = ids.filter((v): v is string => !!v);
  if (!list.length) return [];
  const rows = await prisma.media.findMany({ where: { id: { in: list } }, select: { ...mediaSelect, tags: true, sizeBytes: true, createdAt: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return list.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
}

/* ───────── Edit loaders ───────── */

export function getArtistForEdit(id: string) {
  return prisma.artist.findUnique({
    where: { id },
    include: { gallery: { orderBy: { sortOrder: "asc" }, select: { mediaId: true } }, videos: { select: { videoId: true } } },
  });
}
export function getEpisodeForEdit(id: string) {
  return prisma.episode.findUnique({
    where: { id },
    include: {
      participants: { orderBy: [{ side: "asc" }, { order: "asc" }] },
      rounds: { orderBy: { order: "asc" } },
      gallery: { orderBy: { sortOrder: "asc" }, select: { mediaId: true } },
    },
  });
}
export function getVideoForEdit(id: string) {
  return prisma.video.findUnique({ where: { id }, include: { artists: { select: { artistId: true } } } });
}
export function getAlbumForEdit(id: string) {
  return prisma.album.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" }, select: { mediaId: true, caption: true } } } });
}
export function getNewsForEdit(id: string) {
  return prisma.newsPost.findUnique({ where: { id } });
}
