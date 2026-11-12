"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity";
import { authorize, type Denied } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { getStorage } from "@/lib/storage";
import { clearSettingsMediaRefs } from "@/server/admin/settings-refs";
import { SiteSettingsSchema } from "@/schemas/settings";

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

  await prisma.siteSettings.update({ where: { id: 1 }, data: { [section]: data.data as Prisma.InputJsonValue } });
  invalidate(TAGS_FOR.settings());
  await logActivity({ userId: auth.user.id, action: "update", entityType: "SiteSettings", entityId: "1", meta: { label: section } });
  return { ok: true };
}

/**
 * Danger zone (spec §5): delete everything flagged isSample (generated
 * artwork, sample albums, draft sample news, demo submissions), clear Site
 * Settings references to it, and leave artists, episodes and settings intact.
 */
export async function removeSampleData(input: unknown): Promise<{ ok: true; removed: Record<string, number> } | Denied | { ok: false; status: 400; error: string }> {
  const auth = await authorize("SUPER_ADMIN");
  if (!auth.ok) return auth;
  if (!z.object({ confirm: z.literal("REMOVE SAMPLE DATA") }).safeParse(input).success) {
    return { ok: false, status: 400, error: "Type REMOVE SAMPLE DATA to confirm." };
  }
  const media = await prisma.media.findMany({ where: { isSample: true }, select: { id: true, storageKey: true, variants: true } });
  const mediaIds = media.map((m) => m.id);
  await clearSettingsMediaRefs(mediaIds);
  const [albums, news, submissions, videos, episodes, artists] = await prisma.$transaction([
    prisma.album.deleteMany({ where: { isSample: true } }),
    prisma.newsPost.deleteMany({ where: { isSample: true } }),
    prisma.submission.deleteMany({ where: { isSample: true } }),
    prisma.video.deleteMany({ where: { isSample: true } }),
    prisma.episode.deleteMany({ where: { isSample: true } }),
    prisma.artist.deleteMany({ where: { isSample: true } }),
  ]);
  const deletedMedia = await prisma.media.deleteMany({ where: { id: { in: mediaIds } } });
  const storage = getStorage();
  for (const m of media) {
    for (const k of new Set([m.storageKey, ...Object.values((m.variants as Record<string, string> | null) ?? {})])) {
      await storage.delete(k).catch((e) => console.error("[sample] storage delete failed", k, e));
    }
  }
  const removed = { media: deletedMedia.count, albums: albums.count, news: news.count, submissions: submissions.count, videos: videos.count, episodes: episodes.count, artists: artists.count };
  invalidate(TAGS_FOR.media());
  await logActivity({ userId: auth.user.id, action: "delete", entityType: "SampleData", meta: { label: JSON.stringify(removed) } });
  return { ok: true, removed };
}
