import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAGS } from "@/lib/cache-tags";
import { SiteSettingsSchema, type SiteSettingsData } from "@/schemas/settings";
import { mediaSelect, type MediaLite } from "./media";

const FALLBACK: SiteSettingsData = {
  branding: { logoId: null },
  hero: { titleEn: "FETA SHOW", wordmark: "ፈታ", taglineEn: "Ethiopia's celebrity game show. Two stars. One stage.", ctas: [] },
  ticker: [],
  featured: { episodeId: null, artistIds: [] },
  social: {},
  contact: {},
  sponsors: [],
  seo: { title: "Feta Show (ፈታ)", description: "Ethiopia's celebrity game show. Two stars. One stage." },
  about: { storyEn: "", faq: [], team: [] },
  footer: { broadcastLine: "As seen on EBS TV" },
};

export type PublicSettings = SiteSettingsData & {
  media: Record<string, MediaLite>;
};

/** Site Settings, parsed section by section (a bad section falls back, never crashes the site). */
export async function getSettings(): Promise<PublicSettings> {
  "use cache";
  cacheTag(TAGS.settings, TAGS.media);
  cacheLife("days");

  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const data = { ...FALLBACK };
  if (row) {
    for (const key of Object.keys(SiteSettingsSchema.shape) as (keyof SiteSettingsData)[]) {
      const parsed = SiteSettingsSchema.shape[key].safeParse(row[key]);
      if (parsed.success) (data as Record<string, unknown>)[key] = parsed.data;
    }
  }

  const ids = [
    data.branding.logoId,
    data.hero.posterId,
    data.hero.videoId,
    data.seo.ogImageId,
    ...data.sponsors.map((s) => s.logoId),
    ...data.about.team.map((t) => t.photoId),
  ].filter((v): v is string => !!v);
  const media = ids.length ? await prisma.media.findMany({ where: { id: { in: ids } }, select: mediaSelect }) : [];

  return { ...data, media: Object.fromEntries(media.map((m) => [m.id, m])) };
}
