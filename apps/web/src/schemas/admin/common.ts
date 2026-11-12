import { z } from "zod";

/** Shared admin form schemas. Empty strings from forms become null. */

export const STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const StatusSchema = z.enum(STATUS);

export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .nullish()
    .transform((v) => (v ? v : null));

export const reqText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required.`).max(max, `Use at most ${max} characters.`);

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, "Use at most 80 characters.")
  .refine((v) => v === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Use lowercase letters, numbers and single dashes.")
  .nullish()
  .transform((v) => (v ? v : null));

/** "" / null / undefined → null; otherwise an integer in range. */
export const optInt = (min: number, max: number, label = "Value") =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v),
    z.coerce.number({ message: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be at most ${max}.`).nullable(),
  );

export const optId = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null));

export const IdList = z.array(z.string().min(1)).max(200).default([]);

export const TagList = z
  .array(z.string().trim().min(1).max(40))
  .max(30)
  .default([])
  .transform((tags) => [...new Set(tags.map((t) => t.trim()))].filter(Boolean));

export const optUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), "Enter a full link starting with https://");

/** <input type="date"> value or null. */
export const optDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date.");

/** <input type="datetime-local"> value (Addis Ababa local time) or null. */
export const optDateTime = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v), "Use a valid date and time.");

/** Addis Ababa is UTC+3 all year (no DST). */
export function addisLocalToDate(v: string | null): Date | null {
  return v ? new Date(`${v.slice(0, 16)}:00+03:00`) : null;
}
export function dateToAddisLocal(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 16);
}

export type SaveResult =
  | { ok: true; id: string; slug?: string }
  | { ok: false; status: 400 | 401 | 403 | 404 | 409; error: string; fieldErrors?: Record<string, string> };

export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.map(String).join(".") || "form"] ??= i.message;
  return out;
}
