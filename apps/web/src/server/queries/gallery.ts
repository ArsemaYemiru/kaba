import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { mediaSelect } from "./media";

const published = { status: "PUBLISHED" } as const;

export async function listAlbums() {
  "use cache";
  cacheTag(TAGS.albums, TAGS.media);
  cacheLife("days");
  return prisma.album.findMany({
    where: published,
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      titleEn: true,
      titleAm: true,
      descriptionEn: true,
      cover: { select: mediaSelect },
      items: { take: 1, orderBy: { sortOrder: "asc" }, select: { media: { select: mediaSelect } } },
      _count: { select: { items: true } },
    },
  });
}

export async function getAlbum(slug: string) {
  "use cache";
  cacheTag(TAGS.albums, TAGS.album(slug), TAGS.media);
  cacheLife("days");
  return prisma.album.findFirst({
    where: { slug, ...published },
    select: {
      slug: true,
      titleEn: true,
      titleAm: true,
      descriptionEn: true,
      descriptionAm: true,
      episode: { select: { slug: true, titleEn: true, status: true } },
      items: { orderBy: { sortOrder: "asc" }, select: { id: true, caption: true, media: { select: mediaSelect } } },
    },
  });
}

/** Home gallery strip: first images across published albums. */
export async function galleryStrip(take = 8) {
  "use cache";
  cacheTag(TAGS.albums, TAGS.media);
  cacheLife("days");
  const items = await prisma.albumItem.findMany({
    where: { album: published, media: { type: "IMAGE" } },
    orderBy: [{ sortOrder: "asc" }, { album: { createdAt: "asc" } }],
    take,
    select: { id: true, caption: true, media: { select: mediaSelect }, album: { select: { slug: true } } },
  });
  return items;
}

export async function albumSlugs() {
  "use cache";
  cacheTag(TAGS.albums);
  cacheLife("days");
  return prisma.album.findMany({ where: published, select: { slug: true, updatedAt: true } });
}
