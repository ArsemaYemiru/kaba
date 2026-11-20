/**
 * Runs "Remove sample data" against a THROWAWAY database and checks the result.
 *   DATABASE_URL=…/feta_awards_sampletest pnpm tsx scripts/verify-remove-sample.ts
 */
import "../prisma/seed/load-env";
import { prisma } from "../src/lib/db";
import { removeSampleRows } from "../src/server/admin/sample-data";

async function main() {
  if (!/feta_awards_sampletest/.test(process.env.DATABASE_URL ?? "")) throw new Error("Refusing to run outside feta_awards_sampletest.");
  const count = async () => ({
    editions: await prisma.awardEdition.count(),
    sampleEditions: await prisma.awardEdition.count({ where: { isSample: true } }),
    categories: await prisma.awardCategory.count(),
    honorees: await prisma.nominee.count(),
    staff: await prisma.user.count(),
    realArtists: await prisma.artist.count({ where: { isSample: false } }),
    sampleArtists: await prisma.artist.count({ where: { isSample: true } }),
    sampleMedia: await prisma.media.count({ where: { isSample: true } }),
    videos: await prisma.video.count(),
    albums: await prisma.album.count(),
    news: await prisma.newsPost.count(),
    settings: await prisma.siteSettings.count(),
  });
  const before = await count();
  const { removed } = await removeSampleRows();
  const after = await count();
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { currentEditionId: true, featured: true } });
  console.info(JSON.stringify({ before, removed, after, currentEditionId: settings?.currentEditionId ?? null, featured: settings?.featured }, null, 2));
  const ok =
    after.sampleEditions === 0 && after.categories === 0 && after.honorees === 0 && after.sampleArtists === 0 &&
    after.sampleMedia === 0 && after.staff === before.staff && after.realArtists === before.realArtists && after.settings === 1 &&
    after.news === 1 && settings?.currentEditionId === null;
  console.info(ok ? "OK: sample data removed; real artists, staff, settings and the welcome post kept." : "FAILED");
  if (!ok) process.exitCode = 1;
}
main().finally(() => prisma.$disconnect());
