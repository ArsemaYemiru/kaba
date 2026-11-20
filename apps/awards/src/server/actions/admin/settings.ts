"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity";
import { authorize, type Denied } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { getStorage } from "@/lib/storage";
import { removeSampleRows } from "@/server/admin/sample-data";
import { SiteSettingsSchema, type SiteSettingsData } from "@/schemas/settings";
import { sanitizeRichText } from "@/lib/sanitize";

const SECTIONS = Object.keys(SiteSettingsSchema.shape) as [keyof typeof SiteSettingsSchema.shape, ...(keyof typeof SiteSettingsSchema.shape)[]];
const Input = z.object({ section: z.enum(SECTIONS), data: z.unknown() });

export type SettingsResult = { ok: true } | Denied | { ok: false; status: 400; error: string; issues?: string[] };

/**
 * SUPER_ADMIN only (spec §5). Saves one Site Settings section after validating
 * it against its schema, refreshes the public site and logs the change.
 */
export async function saveSettingsSection(input: unknown): Promise<SettingsResult> {
  const auth = await authorize("SUPER_ADMIN");
  if (!auth.ok) return auth;
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Unknown settings section." };
  const { section } = parsed.data;
  const data = SiteSettingsSchema.shape[section].safeParse(parsed.data.data);
  if (!data.success) return { ok: false, status: 400, error: "Invalid settings.", issues: data.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };

  let value: unknown = data.data;
  // Long-form pages are rich text: sanitize server-side before saving (spec §2).
  if (section === "pages") {
    const pg = data.data as SiteSettingsData["pages"];
    const clean = (p: SiteSettingsData["pages"]["about"]) => ({ ...p, bodyEn: sanitizeRichText(p.bodyEn) ?? "", bodyAm: sanitizeRichText(p.bodyAm) ?? undefined });
    value = { ...pg, about: clean(pg.about), privacy: clean(pg.privacy), terms: clean(pg.terms) };
  }
  if (section === "currentEditionId") {
    await prisma.siteSettings.update({ where: { id: 1 }, data: { currentEditionId: (value as string | null) ?? null } });
  } else {
    await prisma.siteSettings.update({ where: { id: 1 }, data: { [section]: value as Prisma.InputJsonValue } });
  }
  invalidate(TAGS_FOR.settings());
  await logActivity({ userId: auth.user.id, action: "update", entityType: "SiteSettings", entityId: "1", meta: { label: section } });
  return { ok: true };
}

/**
 * Danger zone (spec §6): delete everything flagged isSample (sample editions
 * with their genres and honorees; sample media, videos, albums and news),
 * delete fictional sample artists, clear Site Settings references to it, and
 * leave real artists, settings and staff intact.
 */
export async function removeSampleData(input: unknown): Promise<{ ok: true; removed: Record<string, number> } | Denied | { ok: false; status: 400; error: string }> {
  const auth = await authorize("SUPER_ADMIN");
  if (!auth.ok) return auth;
  if (!z.object({ confirm: z.literal("REMOVE SAMPLE DATA") }).safeParse(input).success) {
    return { ok: false, status: 400, error: "Type REMOVE SAMPLE DATA to confirm." };
  }
  const { removed, media } = await removeSampleRows();
  const storage = getStorage();
  for (const m of media) {
    for (const k of new Set([m.storageKey, ...Object.values((m.variants as Record<string, string> | null) ?? {})])) {
      await storage.delete(k).catch((e) => console.error("[sample] storage delete failed", k, e));
    }
  }
  invalidate(TAGS_FOR.all());
  await logActivity({ userId: auth.user.id, action: "remove_sample", entityType: "SampleData", meta: { label: "Removed sample data", ...removed } });
  return { ok: true, removed };
}
