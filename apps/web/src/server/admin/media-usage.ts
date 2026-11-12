import "server-only";
import { prisma } from "@/lib/db";
import { SiteSettingsSchema } from "@/schemas/settings";

export type MediaUsage = { label: string; href: string };

/**
 * Where each media item is used (spec §5 "usage count with used-in links").
 * Covers every Media relation plus the ids stored inside Site Settings JSON.
 */
export async function mediaUsages(ids: string[]): Promise<Map<string, MediaUsage[]>> {
  const out = new Map<string, MediaUsage[]>(ids.map((id) => [id, []]));
  if (ids.length === 0) return out;
  const add = (id: string | null | undefined, u: MediaUsage) => {
    if (id && out.has(id)) out.get(id)!.push(u);
  };
  const inIds = { in: ids };

  const [artists, artistGallery, episodes, episodeGallery, videos, albums, albumItems, news, settings] = await Promise.all([
    prisma.artist.findMany({ where: { OR: [{ portraitId: inIds }, { coverId: inIds }] }, select: { id: true, nameEn: true, portraitId: true, coverId: true } }),
    prisma.artistMedia.findMany({ where: { mediaId: inIds }, select: { mediaId: true, artist: { select: { id: true, nameEn: true } } } }),
    prisma.episode.findMany({ where: { OR: [{ thumbnailId: inIds }, { videoMediaId: inIds }] }, select: { id: true, titleEn: true, thumbnailId: true, videoMediaId: true } }),
    prisma.episodeMedia.findMany({ where: { mediaId: inIds }, select: { mediaId: true, episode: { select: { id: true, titleEn: true } } } }),
    prisma.video.findMany({ where: { OR: [{ mediaId: inIds }, { posterId: inIds }] }, select: { id: true, titleEn: true, mediaId: true, posterId: true } }),
    prisma.album.findMany({ where: { coverId: inIds }, select: { id: true, titleEn: true, coverId: true } }),
    prisma.albumItem.findMany({ where: { mediaId: inIds }, select: { mediaId: true, album: { select: { id: true, titleEn: true } } } }),
    prisma.newsPost.findMany({ where: { coverId: inIds }, select: { id: true, titleEn: true, coverId: true } }),
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
  ]);

  for (const a of artists) {
    add(a.portraitId, { label: `Artist portrait · ${a.nameEn}`, href: `/admin/artists/${a.id}` });
    add(a.coverId, { label: `Artist cover · ${a.nameEn}`, href: `/admin/artists/${a.id}` });
  }
  for (const g of artistGallery) add(g.mediaId, { label: `Artist gallery · ${g.artist.nameEn}`, href: `/admin/artists/${g.artist.id}` });
  for (const e of episodes) {
    add(e.thumbnailId, { label: `Episode thumbnail · ${e.titleEn}`, href: `/admin/episodes/${e.id}` });
    add(e.videoMediaId, { label: `Episode video · ${e.titleEn}`, href: `/admin/episodes/${e.id}` });
  }
  for (const g of episodeGallery) add(g.mediaId, { label: `Episode gallery · ${g.episode.titleEn}`, href: `/admin/episodes/${g.episode.id}` });
  for (const v of videos) {
    add(v.mediaId, { label: `Video file · ${v.titleEn}`, href: `/admin/videos/${v.id}` });
    add(v.posterId, { label: `Video poster · ${v.titleEn}`, href: `/admin/videos/${v.id}` });
  }
  for (const a of albums) add(a.coverId, { label: `Album cover · ${a.titleEn}`, href: `/admin/gallery/${a.id}` });
  for (const i of albumItems) add(i.mediaId, { label: `Album · ${i.album.titleEn}`, href: `/admin/gallery/${i.album.id}` });
  for (const n of news) add(n.coverId, { label: `News cover · ${n.titleEn}`, href: `/admin/news/${n.id}` });

  if (settings) {
    const s = (k: keyof typeof SiteSettingsSchema.shape) => {
      const r = SiteSettingsSchema.shape[k].safeParse(settings[k]);
      return r.success ? r.data : null;
    };
    const branding = s("branding") as { logoId?: string | null } | null;
    const hero = s("hero") as { posterId?: string | null; videoId?: string | null } | null;
    const seo = s("seo") as { ogImageId?: string | null } | null;
    const sponsors = (s("sponsors") as { name: string; logoId: string }[] | null) ?? [];
    const about = s("about") as { team: { name: string; photoId?: string | null }[] } | null;
    const href = "/admin/settings";
    add(branding?.logoId, { label: "Site logo", href });
    add(hero?.posterId, { label: "Hero poster", href });
    add(hero?.videoId, { label: "Hero video", href });
    add(seo?.ogImageId, { label: "Default social image", href });
    for (const sp of sponsors) add(sp.logoId, { label: `Sponsor logo · ${sp.name}`, href });
    for (const m of about?.team ?? []) add(m.photoId, { label: `Team photo · ${m.name}`, href });
  }
  return out;
}
