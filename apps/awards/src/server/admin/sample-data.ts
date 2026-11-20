import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { SiteSettingsSchema } from "@/schemas/settings";
import { clearSettingsMediaRefs } from "./settings-refs";

/**
 * The database part of "Remove sample data" (spec §6), kept free of Next APIs
 * so scripts/verify-remove-sample.ts can run it against a throwaway database.
 * Returns what was removed and the media rows whose files the caller deletes.
 */
export async function removeSampleRows() {
  const media = await prisma.media.findMany({ where: { isSample: true }, select: { id: true, storageKey: true, variants: true } });
  const mediaIds = media.map((m) => m.id);
  await clearSettingsMediaRefs(mediaIds);
  const editions = await prisma.awardEdition.findMany({ where: { isSample: true }, select: { id: true } });
  const editionIds = editions.map((e) => e.id);

  const removed = await prisma.$transaction(
    async (tx) => {
      const honorees = await tx.nominee.count({ where: { category: { editionId: { in: editionIds } } } });
      const categories = await tx.awardCategory.count({ where: { editionId: { in: editionIds } } });
      const eds = await tx.awardEdition.deleteMany({ where: { id: { in: editionIds } } });
      // Fictional sample artists (their honors in real editions, if any, go with them).
      const artists = await tx.artist.deleteMany({ where: { isSample: true } });
      const videos = await tx.video.deleteMany({ where: { isSample: true } });
      const albums = await tx.album.deleteMany({ where: { isSample: true } });
      const news = await tx.newsPost.deleteMany({ where: { isSample: true } });
      const deletedMedia = await tx.media.deleteMany({ where: { id: { in: mediaIds } } });
      // Settings pointing at removed rows.
      const row = await tx.siteSettings.findUnique({ where: { id: 1 }, select: { currentEditionId: true, featured: true } });
      if (row) {
        const featured = SiteSettingsSchema.shape.featured.safeParse(row.featured);
        const nomineeIds = featured.success ? featured.data.nomineeIds : [];
        const alive = new Set((await tx.nominee.findMany({ where: { id: { in: nomineeIds } }, select: { id: true } })).map((n) => n.id));
        await tx.siteSettings.update({
          where: { id: 1 },
          data: {
            currentEditionId: row.currentEditionId && editionIds.includes(row.currentEditionId) ? null : row.currentEditionId,
            ...(featured.success ? { featured: { ...featured.data, nomineeIds: nomineeIds.filter((id) => alive.has(id)) } as Prisma.InputJsonValue } : {}),
          },
        });
      }
      return { editions: eds.count, categories, honorees, artists: artists.count, videos: videos.count, albums: albums.count, news: news.count, media: deletedMedia.count };
    },
    { timeout: 60_000 },
  );
  return { removed, media };
}
