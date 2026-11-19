import { prisma } from "@/lib/db";

/** Pages with no CMS lookup. */
const STATIC = new Set(["/", "/awards/archive", "/vote", "/artists", "/videos", "/gallery", "/news", "/about", "/rules", "/privacy", "/terms"]);

export type RouteCheck = { ok: true } | { ok: false } | { redirect: string };

const published = { status: "PUBLISHED" } as const;
const announced = { ...published, phase: { not: "DRAFT" as const } };

/**
 * Runs in the proxy before streaming (streamed pages always start with 200),
 * so unknown, draft and unannounced records get real 404s (A-39).
 * `path` has no locale prefix and no trailing slash.
 */
export async function checkPublicRoute(path: string): Promise<RouteCheck> {
  if (STATIC.has(path)) return { ok: true };
  if (path === "/styleguide") return { ok: process.env.NODE_ENV !== "production" || process.env.ENABLE_STYLEGUIDE === "1" };
  if (path === "/awards") {
    // Plain queries: 'use cache' functions can't run in the proxy.
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { currentEditionId: true } });
    const e =
      (settings?.currentEditionId ? await prisma.awardEdition.findFirst({ where: { id: settings.currentEditionId, ...published }, select: { slug: true } }) : null) ??
      (await prisma.awardEdition.findFirst({ where: published, orderBy: { year: "desc" }, select: { slug: true } }));
    return { redirect: e ? `/awards/${e.slug}` : "/awards/archive" };
  }
  const seg = path.split("/").slice(1);
  const select = { id: true };
  const found = (v: unknown) => ({ ok: !!v }) as RouteCheck;
  if (seg.length === 2) {
    const [section, slug] = seg as [string, string];
    switch (section) {
      case "awards":
        return found(await prisma.awardEdition.findFirst({ where: { slug, ...published }, select }));
      case "nominees":
        return found(await prisma.nominee.findFirst({ where: { slug, ...published, category: { ...published, edition: announced } }, select }));
      case "artists":
        return found(await prisma.artist.findFirst({ where: { slug, ...published }, select }));
      case "gallery":
        return found(await prisma.album.findFirst({ where: { slug, ...published }, select }));
      case "news":
        return found(await prisma.newsPost.findFirst({ where: { slug, ...published, publishedAt: { lte: new Date() } }, select }));
    }
  }
  if (seg.length === 3 && seg[0] === "awards") {
    const [, year, rest] = seg as [string, string, string];
    if (rest === "winners") return found(await prisma.awardEdition.findFirst({ where: { slug: year, ...published }, select }));
    return found(await prisma.awardCategory.findFirst({ where: { slug: rest, ...published, edition: { slug: year, ...announced } }, select }));
  }
  return { ok: false };
}
