import { z } from "zod";
import { youtubeId } from "@/lib/youtube";
import { IdList, optDate, optDateTime, optId, optInt, optText, optUrl, reqText, SlugSchema, StatusSchema, TagList } from "./common";

const YEAR_MAX = new Date().getFullYear();
const html = (max: number) => optText(max);

export const ARTIST_CATEGORIES = ["SINGER", "MUSICIAN", "ACTOR", "COMEDIAN", "DANCER", "PRODUCER_DJ", "HOST_MEDIA", "OTHER"] as const;
export const SOCIAL_PLATFORMS = ["telegram", "tiktok", "youtube", "instagram", "facebook", "x", "website"] as const;

/* ─────────────── Artists ─────────────── */
export const ArtistSchema = z
  .object({
    nameEn: reqText(120, "English name"),
    nameAm: optText(120),
    slug: SlugSchema,
    stageName: optText(120),
    legalNameEn: optText(120),
    legalNameAm: optText(120),
    isGroup: z.boolean().default(false),
    categories: z.array(z.enum(ARTIST_CATEGORIES)).min(1, "Pick at least one category.").max(8),
    shortBioEn: optText(600),
    shortBioAm: optText(600),
    bioEn: html(20000),
    bioAm: html(20000),
    birthYear: optInt(1850, YEAR_MAX, "Birth year"),
    deathYear: optInt(1850, YEAR_MAX, "Death year"),
    yearsActive: optText(40),
    genres: TagList,
    notableWorks: z
      .array(z.object({ title: reqText(160, "Title"), year: optInt(1850, YEAR_MAX + 5, "Year"), type: optText(40) }))
      .max(50)
      .default([]),
    socialLinks: z
      .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: z.string().trim().url("Enter a full link starting with https://").max(500) }))
      .max(10)
      .default([]),
    portraitId: optId,
    coverId: optId,
    galleryIds: IdList,
    videoIds: IdList,
    isLegend: z.boolean().default(false),
    featured: z.boolean().default(false),
    status: StatusSchema,
    sortOrder: optInt(0, 100000, "Sort order").transform((v) => v ?? 0),
    seoTitle: optText(70),
    seoDescription: optText(200),
  })
  .refine((d) => !d.birthYear || !d.deathYear || d.deathYear >= d.birthYear, { path: ["deathYear"], message: "Death year can't be before birth year." });
export type ArtistInput = z.input<typeof ArtistSchema>;

/* ─────────────── Episodes ─────────────── */
export const EPISODE_TYPES = ["GAME_SHOW", "HOLIDAY_SPECIAL", "PERFORMANCE", "BEHIND_THE_SCENES"] as const;
export const VIDEO_SOURCES = ["NONE", "YOUTUBE", "UPLOAD"] as const;

const Participant = z
  .object({ side: z.enum(["A", "B"]), artistId: optId, guestName: optText(120) })
  .refine((p) => !!p.artistId !== !!p.guestName, { message: "Pick an artist or type a name (not both).", path: ["guestName"] });

export const EpisodeSchema = z
  .object({
    titleEn: reqText(160, "English title"),
    titleAm: optText(160),
    slug: SlugSchema,
    season: optInt(1, 100, "Season"),
    episodeNumber: optInt(1, 10000, "Episode number"),
    type: z.enum(EPISODE_TYPES),
    airDate: optDate,
    participants: z.array(Participant).max(20).default([]),
    rounds: z
      .array(z.object({ nameEn: reqText(80, "Round name"), nameAm: optText(80), scoreA: optInt(-100000, 100000, "Score"), scoreB: optInt(-100000, 100000, "Score") }))
      .max(30)
      .default([]),
    result: z.enum(["NONE", "A", "B", "TIE"]).default("NONE"),
    videoSource: z.enum(VIDEO_SOURCES),
    youtubeUrl: optUrl,
    videoMediaId: optId,
    thumbnailId: optId,
    descriptionEn: html(20000),
    descriptionAm: html(20000),
    galleryIds: IdList,
    featured: z.boolean().default(false),
    status: StatusSchema,
  })
  .superRefine((d, ctx) => {
    for (const side of ["A", "B"] as const) {
      if (d.status === "PUBLISHED" && !d.participants.some((p) => p.side === side)) {
        ctx.addIssue({ code: "custom", path: ["participants"], message: `Add at least one participant on side ${side} before publishing.` });
      }
    }
    if (d.videoSource === "YOUTUBE" && !youtubeId(d.youtubeUrl)) ctx.addIssue({ code: "custom", path: ["youtubeUrl"], message: "Enter a valid YouTube link." });
    if (d.videoSource === "UPLOAD" && !d.videoMediaId) ctx.addIssue({ code: "custom", path: ["videoMediaId"], message: "Choose an uploaded video." });
  });
export type EpisodeInput = z.input<typeof EpisodeSchema>;

/* ─────────────── Videos ─────────────── */
export const VIDEO_TYPES = ["FULL_EPISODE", "HIGHLIGHT", "PERFORMANCE", "BEHIND_THE_SCENES", "INTERVIEW"] as const;

export const VideoSchema = z
  .object({
    titleEn: reqText(160, "English title"),
    titleAm: optText(160),
    slug: SlugSchema,
    type: z.enum(VIDEO_TYPES),
    source: z.enum(VIDEO_SOURCES),
    youtubeUrl: optUrl,
    mediaId: optId,
    captionsUrl: optUrl,
    posterId: optId,
    episodeId: optId,
    artistIds: IdList,
    featured: z.boolean().default(false),
    status: StatusSchema,
    publishedAt: optDateTime,
  })
  .superRefine((d, ctx) => {
    if (d.source === "YOUTUBE" && !youtubeId(d.youtubeUrl)) ctx.addIssue({ code: "custom", path: ["youtubeUrl"], message: "Enter a valid YouTube link." });
    if (d.source === "UPLOAD" && !d.mediaId) ctx.addIssue({ code: "custom", path: ["mediaId"], message: "Choose an uploaded video." });
  });
export type VideoInput = z.input<typeof VideoSchema>;

/* ─────────────── Gallery albums ─────────────── */
export const AlbumSchema = z.object({
  titleEn: reqText(160, "English title"),
  titleAm: optText(160),
  slug: SlugSchema,
  descriptionEn: optText(1000),
  descriptionAm: optText(1000),
  coverId: optId,
  episodeId: optId,
  items: z.array(z.object({ mediaId: z.string().min(1), caption: optText(300) })).max(500).default([]),
  status: StatusSchema,
});
export type AlbumInput = z.input<typeof AlbumSchema>;

/* ─────────────── News ─────────────── */
export const NewsSchema = z.object({
  titleEn: reqText(200, "English title"),
  titleAm: optText(200),
  slug: SlugSchema,
  excerptEn: optText(400),
  excerptAm: optText(400),
  bodyEn: z.string().trim().min(8, "Write the article body.").max(100000),
  bodyAm: html(100000),
  coverId: optId,
  tags: TagList,
  featured: z.boolean().default(false),
  status: StatusSchema,
  publishedAt: optDateTime,
});
export type NewsInput = z.input<typeof NewsSchema>;

/* ─────────────── Media ─────────────── */
export const MediaUpdateSchema = z.object({
  alt: z.string().trim().max(300, "Use at most 300 characters."),
  caption: optText(500),
  credit: optText(200),
  tags: TagList,
});

/* ─────────────── Submissions ─────────────── */
export const SUBMISSION_STATUSES = ["NEW", "REVIEWED", "SHORTLISTED", "ARCHIVED"] as const;
export const SubmissionUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(SUBMISSION_STATUSES),
  notes: optText(5000),
});

/* ─────────────── Users ─────────────── */
export const CreateUserSchema = z.object({
  name: reqText(80, "Name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  role: z.enum(["SUPER_ADMIN", "EDITOR"]),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
