import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { SiteSettingsSchema, type SiteSettingsData } from "@/schemas/settings";
import { mediaSelect, type MediaLite } from "./media";

const FALLBACK: SiteSettingsData = {
  branding: { logoId: null },
  hero: { titleEn: "FETA AWARDS", wordmark: "ፈታ", taglineEn: "Celebrating Ethiopia's brightest stars. Your vote decides." },
  ticker: [],
  currentEditionId: null,
  featured: { nomineeIds: [], artistIds: [] },
  social: {},
  contact: {},
  sponsors: [],
  seo: { title: "Feta Awards (ፈታ)", description: "Celebrating Ethiopia's brightest stars. Your vote decides." },
  footer: {},
  pages: {
    about: { bodyEn: "", isTemplate: true },
    rules: { bodyEn: "", isTemplate: true },
    privacy: { bodyEn: "", isTemplate: true },
    terms: { bodyEn: "", isTemplate: true },
    faq: [],
  },
  voting: { requirePhoneVerificationToVote: false },
};

export type PublicSettings = SiteSettingsData & { media: Record<string, MediaLite> };

/** Site Settings, parsed per section (a bad section falls back, never crashes the site). */
export async function getSettings(): Promise<PublicSettings> {
  "use cache";
  cacheTag(TAGS.settings, TAGS.media);
  cacheLife("days");
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const data: SiteSettingsData = { ...FALLBACK };
  if (row) {
    for (const key of Object.keys(SiteSettingsSchema.shape) as (keyof SiteSettingsData)[]) {
      const parsed = SiteSettingsSchema.shape[key].safeParse(row[key as keyof typeof row]);
      if (parsed.success) (data as Record<string, unknown>)[key] = parsed.data;
    }
  }
  const ids = [data.branding.logoId, data.hero.posterId, data.hero.videoId, data.seo.ogImageId, ...data.sponsors.map((s) => s.logoId)].filter((v): v is string => !!v);
  const media = ids.length ? await prisma.media.findMany({ where: { id: { in: ids } }, select: mediaSelect }) : [];
  return { ...data, media: Object.fromEntries(media.map((m) => [m.id, m])) };
}
