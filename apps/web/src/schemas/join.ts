import { z } from "zod";
import { normalizeEthiopianPhone } from "@/lib/phone";

/**
 * Join forms (spec §4.8), shared by the client forms and the server action.
 * Messages are keys into the "join.errors" messages.
 */
const name = z.string().trim().min(2, "name").max(80, "tooLong");
const email = z.string().trim().max(120, "tooLong").email("email");
const phone = z
  .string()
  .trim()
  .min(1, "required")
  .transform((v, ctx) => {
    const n = normalizeEthiopianPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return n;
  });
const consent = z.literal(true, { message: "consent" });
/** Honeypot: must stay empty. */
const website = z.string().max(0).optional().default("");

export const CONTESTANT_CATEGORIES = ["SINGER", "MUSICIAN", "ACTOR", "COMEDIAN", "DANCER", "PRODUCER_DJ", "HOST_MEDIA", "OTHER"] as const;

const url = z.string().trim().url("url").max(300, "tooLong");

export const ContestantSchema = z.object({
  type: z.literal("CONTESTANT"),
  name,
  phone,
  email,
  city: z.string().trim().min(2, "required").max(60, "tooLong"),
  category: z.enum(CONTESTANT_CATEGORIES, { message: "required" }),
  socialLinks: z
    .string()
    .trim()
    .max(600, "tooLong")
    .transform((v) => v.split(/\s+/).filter(Boolean))
    .pipe(z.array(url).max(5, "tooMany")),
  whyYou: z.string().trim().min(20, "whyShort").max(1000, "tooLong"),
  videoLink: z.union([z.literal(""), url]).optional().default(""),
  consent,
  website,
});

export const AudienceSchema = z.object({
  type: z.literal("AUDIENCE"),
  name,
  phone,
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date")
    .refine((d) => d >= new Date().toISOString().slice(0, 10), "datePast"),
  groupSize: z.coerce.number({ message: "groupSize" }).int("groupSize").min(1, "groupSize").max(10, "groupSize"),
  consent,
  website,
});

export const SponsorSchema = z.object({
  type: z.literal("SPONSOR"),
  company: z.string().trim().min(2, "required").max(120, "tooLong"),
  name,
  phone,
  email,
  message: z.string().trim().min(10, "messageShort").max(2000, "tooLong"),
  consent,
  website,
});

export const JoinSchema = z.discriminatedUnion("type", [ContestantSchema, AudienceSchema, SponsorSchema]);
export type JoinInput = z.input<typeof JoinSchema>;
export type JoinData = z.output<typeof JoinSchema>;

export type JoinResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rateLimited" | "server"; fieldErrors?: Record<string, string> };
