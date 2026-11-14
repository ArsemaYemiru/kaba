import { prisma } from "@/lib/db";

/** Check before streaming so unpublished/missing CMS records send real 404s. */
export async function publicDetailExists(section: string, slug: string) {
  const where = { slug, status: "PUBLISHED" as const };
  const select = { id: true };
  switch (section) {
    case "artists":
      return !!(await prisma.artist.findFirst({ where, select }));
    case "episodes":
      return !!(await prisma.episode.findFirst({ where, select }));
    case "gallery":
      return !!(await prisma.album.findFirst({ where, select }));
    case "news":
      return !!(await prisma.newsPost.findFirst({ where: { ...where, publishedAt: { lte: new Date() } }, select }));
    default:
      return false;
  }
}
