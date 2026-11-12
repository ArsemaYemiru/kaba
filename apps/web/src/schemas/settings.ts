import { z } from "zod";

/**
 * Site Settings (spec §5): one row, one typed JSON column per section.
 * Every read and write goes through these schemas.
 */
const id = z.string().min(1);
const optUrl = z.union([z.string().url(), z.literal("")]).optional();
const href = z.string().min(1).max(500); // internal path ("/join") or absolute URL

export const BrandingSchema = z.object({ logoId: id.nullish() });

export const HeroSchema = z.object({
  titleEn: z.string().max(80).default("FETA SHOW"),
  wordmark: z.string().max(20).default("ፈታ"),
  taglineEn: z.string().max(200),
  taglineAm: z.string().max(200).optional(),
  videoId: id.nullish(),
  posterId: id.nullish(),
  ctas: z
    .array(z.object({ labelEn: z.string().min(1).max(40), labelAm: z.string().max(40).optional(), href }))
    .max(2),
});

export const TickerSchema = z.array(z.string().min(1).max(120)).max(20);

export const FeaturedSchema = z.object({
  episodeId: id.nullish(),
  artistIds: z.array(id).max(24),
});

export const SocialSchema = z.object({
  telegram: optUrl,
  tiktok: optUrl,
  youtube: optUrl,
  instagram: optUrl,
  facebook: optUrl,
  x: optUrl,
});

export const ContactSchema = z.object({
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().max(30).optional(),
});

export const SponsorsSchema = z.array(z.object({ name: z.string().min(1).max(80), logoId: id, url: optUrl })).max(30);

export const SeoSchema = z.object({
  title: z.string().max(70),
  description: z.string().max(200),
  ogImageId: id.nullish(),
});

export const FaqItemSchema = z.object({
  qEn: z.string().min(1).max(200),
  aEn: z.string().min(1).max(1000),
  qAm: z.string().max(200).optional(),
  aAm: z.string().max(1000).optional(),
});

export const TeamMemberSchema = z.object({
  name: z.string().min(1).max(80),
  roleEn: z.string().max(80),
  roleAm: z.string().max(80).optional(),
  photoId: id.nullish(),
});

export const AboutSchema = z.object({
  storyEn: z.string().max(4000),
  storyAm: z.string().max(4000).optional(),
  faq: z.array(FaqItemSchema).max(30),
  team: z.array(TeamMemberSchema).max(30),
});

export const FooterSchema = z.object({
  textEn: z.string().max(300).optional(),
  textAm: z.string().max(300).optional(),
  broadcastLine: z.string().max(80),
});

export const SiteSettingsSchema = z.object({
  branding: BrandingSchema,
  hero: HeroSchema,
  ticker: TickerSchema,
  featured: FeaturedSchema,
  social: SocialSchema,
  contact: ContactSchema,
  sponsors: SponsorsSchema,
  seo: SeoSchema,
  about: AboutSchema,
  footer: FooterSchema,
});

export type SiteSettingsData = z.infer<typeof SiteSettingsSchema>;
