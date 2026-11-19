import { z } from "zod";

/** Site Settings (spec §6): one row, one typed JSON column per section. */
const id = z.string().min(1);
const optUrl = z.union([z.string().url(), z.literal("")]).optional();

export const BrandingSchema = z.object({ logoId: id.nullish() });

export const HeroSchema = z.object({
  titleEn: z.string().max(80).default("FETA AWARDS"),
  wordmark: z.string().max(20).default("ፈታ"),
  taglineEn: z.string().max(200),
  taglineAm: z.string().max(200).optional(),
  videoId: id.nullish(),
  posterId: id.nullish(),
});

/** Custom items; phase/date items are generated from the current edition. */
export const TickerSchema = z.array(z.string().min(1).max(120)).max(20);

export const FeaturedSchema = z.object({
  nomineeIds: z.array(id).max(24),
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

export const ContactSchema = z.object({ email: z.union([z.string().email(), z.literal("")]).optional() });

export const SponsorsSchema = z.array(z.object({ name: z.string().min(1).max(80), logoId: id, url: optUrl })).max(30);

export const SeoSchema = z.object({ title: z.string().max(70), description: z.string().max(200), ogImageId: id.nullish() });

export const FooterSchema = z.object({ textEn: z.string().max(300).optional(), textAm: z.string().max(300).optional() });

/** A long-form page. `isTemplate` stays true until staff edit it (checklist flag). */
export const PageSchema = z.object({
  bodyEn: z.string().max(60000),
  bodyAm: z.string().max(60000).optional(),
  isTemplate: z.boolean().default(true),
});

export const FaqItemSchema = z.object({
  qEn: z.string().min(1).max(200),
  aEn: z.string().min(1).max(1000),
  qAm: z.string().max(200).optional(),
  aAm: z.string().max(1000).optional(),
});

export const PagesSchema = z.object({
  about: PageSchema,
  rules: PageSchema,
  privacy: PageSchema,
  terms: PageSchema,
  faq: z.array(FaqItemSchema).max(30),
  organizer: z.string().max(200).optional(),
});

export const VotingSettingsSchema = z.object({ requirePhoneVerificationToVote: z.boolean().default(false) });

export const SiteSettingsSchema = z.object({
  branding: BrandingSchema,
  hero: HeroSchema,
  ticker: TickerSchema,
  currentEditionId: id.nullish(),
  featured: FeaturedSchema,
  social: SocialSchema,
  contact: ContactSchema,
  sponsors: SponsorsSchema,
  seo: SeoSchema,
  footer: FooterSchema,
  pages: PagesSchema,
  voting: VotingSettingsSchema,
});

export type SiteSettingsData = z.infer<typeof SiteSettingsSchema>;
