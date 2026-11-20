import { z } from "zod";
import { CATEGORY_ICONS } from "@/components/awards/category-icons";
import { optDateTime, optId, optInt, optText, optUrl, reqText, SlugSchema, StatusSchema } from "./common";

/** A yearly edition. Draft = admin-only; Published = announced (A-76). */
export const EditionSchema = z.object({
  year: z.coerce.number({ message: "Year must be a number." }).int().min(2000, "Use a year from 2000.").max(2100),
  nameEn: reqText(120, "English name"),
  nameAm: optText(120),
  slug: SlugSchema,
  ceremonyAt: optDateTime,
  venue: optText(200),
  broadcastPartner: optText(200),
  heroMediaId: optId,
  status: StatusSchema,
});

/** A genre category within an edition (Classical, Bati, Afrobeat…). */
export const CategorySchema = z.object({
  editionId: z.string().min(1, "Choose an edition."),
  nameEn: reqText(120, "English name"),
  nameAm: optText(120),
  slug: SlugSchema,
  descriptionEn: optText(1000),
  descriptionAm: optText(1000),
  icon: z.string().refine((v) => v in CATEGORY_ICONS, "Pick an icon from the list."),
  sortOrder: optInt(0, 10000, "Sort order"),
  status: StatusSchema,
});

/** One artist recognized in one genre: citation + optional featured work. */
export const HonoreeSchema = z.object({
  categoryId: z.string().min(1, "Choose a category."),
  artistId: z.string().min(1, "Choose an artist."),
  displayNameEn: optText(160),
  displayNameAm: optText(160),
  slug: SlugSchema,
  workTitleEn: optText(160),
  workTitleAm: optText(160),
  imageId: optId,
  blurbEn: optText(1500),
  blurbAm: optText(1500),
  youtubeUrl: optUrl,
  sortOrder: optInt(0, 10000, "Sort order"),
  status: StatusSchema,
});

/** Category page: place several artists into the genre at once (as drafts). */
export const AddArtistsSchema = z.object({ categoryId: z.string().min(1), artistIds: z.array(z.string().min(1)).min(1, "Pick at least one artist.").max(200) });

export const ReorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

/** One CSV row for the honoree import. `artist` is the artist's slug. */
export const CSV_COLUMNS = ["category", "artist", "blurbEn", "blurbAm", "workTitleEn", "workTitleAm", "youtubeUrl", "status"] as const;
export const HonoreeCsvRow = z.object({
  category: reqText(120, "category"),
  artist: reqText(160, "artist"),
  blurbEn: optText(1500),
  blurbAm: optText(1500),
  workTitleEn: optText(160),
  workTitleAm: optText(160),
  youtubeUrl: optUrl,
  status: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || "DRAFT")
    .pipe(StatusSchema),
});
