import { z } from "zod";
import { CATEGORY_ICONS } from "@/components/awards/category-icons";
import { IdList, optDateTime, optId, optInt, optText, optUrl, reqText, SlugSchema, StatusSchema } from "./common";

export const VOTING_TYPES = ["PUBLIC_VOTE", "JURY", "HYBRID", "HONORARY"] as const;
export const NOMINEE_TYPES = ["PERSON", "GROUP", "SONG", "ALBUM", "MUSIC_VIDEO", "FILM", "SERIES", "CREATOR", "OTHER"] as const;
export const PHASE_VALUES = ["DRAFT", "NOMINEES_ANNOUNCED", "VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"] as const;

export const EditionSchema = z
  .object({
    year: z.coerce.number({ message: "Year must be a number." }).int().min(2000, "Use a year from 2000.").max(2100),
    nameEn: reqText(120, "English name"),
    nameAm: optText(120),
    slug: SlugSchema,
    nomineesAnnouncedAt: optDateTime,
    votingOpensAt: optDateTime,
    votingClosesAt: optDateTime,
    ceremonyAt: optDateTime,
    venue: optText(200),
    broadcastPartner: optText(200),
    heroMediaId: optId,
    showPublicPercentages: z.boolean().default(false),
    status: StatusSchema,
  })
  .superRefine((d, ctx) => {
    if (d.votingOpensAt && d.votingClosesAt && d.votingOpensAt >= d.votingClosesAt) ctx.addIssue({ code: "custom", path: ["votingClosesAt"], message: "Voting must close after it opens." });
  });

export const CategorySchema = z
  .object({
    editionId: z.string().min(1, "Choose an edition."),
    nameEn: reqText(120, "English name"),
    nameAm: optText(120),
    slug: SlugSchema,
    descriptionEn: optText(1000),
    descriptionAm: optText(1000),
    icon: z.string().refine((v) => v in CATEGORY_ICONS, "Pick an icon from the list."),
    votingType: z.enum(VOTING_TYPES),
    publicWeight: z.coerce.number().int().min(0).max(100),
    juryWeight: z.coerce.number().int().min(0).max(100),
    nomineeType: z.enum(NOMINEE_TYPES),
    sortOrder: optInt(0, 10000, "Sort order"),
    status: StatusSchema,
  })
  .superRefine((d, ctx) => {
    if (d.publicWeight + d.juryWeight !== 100) ctx.addIssue({ code: "custom", path: ["juryWeight"], message: "Public and jury weights must add up to 100." });
  });

export const NomineeSchema = z.object({
  categoryId: z.string().min(1, "Choose a category."),
  displayNameEn: reqText(160, "Display name"),
  displayNameAm: optText(160),
  slug: SlugSchema,
  workTitleEn: optText(160),
  workTitleAm: optText(160),
  artistIds: IdList,
  imageId: optId,
  blurbEn: optText(1500),
  blurbAm: optText(1500),
  youtubeUrl: optUrl,
  sortOrder: optInt(0, 10000, "Sort order"),
  status: StatusSchema,
});

export const PhaseChangeSchema = z.object({ editionId: z.string().min(1), to: z.enum(PHASE_VALUES), reason: z.string().trim().max(500).optional() });
export const ReorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

/** One CSV row for the nominee import (spec §6). */
export const CSV_COLUMNS = ["category", "displayNameEn", "displayNameAm", "workTitleEn", "workTitleAm", "blurbEn", "blurbAm", "youtubeUrl", "artists", "status"] as const;
export const NomineeCsvRow = z.object({
  category: reqText(120, "category"),
  displayNameEn: reqText(160, "displayNameEn"),
  displayNameAm: optText(160),
  workTitleEn: optText(160),
  workTitleAm: optText(160),
  blurbEn: optText(1500),
  blurbAm: optText(1500),
  youtubeUrl: optUrl,
  artists: optText(500),
  status: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || "DRAFT")
    .pipe(StatusSchema),
});
