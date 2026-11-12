import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Remove deleted media ids from the Site Settings JSON sections. */
export async function clearSettingsMediaRefs(ids: string[]) {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) return;
  const gone = new Set(ids);
  const drop = (v: unknown) => (typeof v === "string" && gone.has(v) ? null : v);
  const branding = { ...(row.branding as Record<string, unknown>) };
  const hero = { ...(row.hero as Record<string, unknown>) };
  const seo = { ...(row.seo as Record<string, unknown>) };
  const about = { ...(row.about as Record<string, unknown>) };
  branding.logoId = drop(branding.logoId);
  hero.posterId = drop(hero.posterId);
  hero.videoId = drop(hero.videoId);
  seo.ogImageId = drop(seo.ogImageId);
  const sponsors = ((row.sponsors as { logoId?: string }[]) ?? []).filter((s) => !s.logoId || !gone.has(s.logoId));
  about.team = ((about.team as { photoId?: string | null }[]) ?? []).map((m) => ({ ...m, photoId: drop(m.photoId) }));
  await prisma.siteSettings.update({
    where: { id: 1 },
    data: { branding: branding as Prisma.InputJsonValue, hero: hero as Prisma.InputJsonValue, seo: seo as Prisma.InputJsonValue, sponsors: sponsors as Prisma.InputJsonValue, about: about as Prisma.InputJsonValue },
  });
}
