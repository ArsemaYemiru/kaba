import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { sniff } from "@/lib/media/sniff";
import { getStorage } from "@/lib/storage";
import { uploadGuard } from "@/server/admin/upload-guard";
import { mediaSelect } from "@/server/queries/media";

const KEY_RE = /^uploads\/videos\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(mp4|webm)$/;
const Input = z.object({
  key: z.string().regex(KEY_RE),
  filename: z.string().max(300).default(""),
  uploadId: z.string().max(500).optional(),
  parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10000), etag: z.string().max(200) })).max(10000).optional(),
  durationSec: z.number().positive().max(24 * 3600).optional(),
});

/** Step 3: finish the upload, verify the bytes really are MP4/WebM, register the Media row. */
export async function POST(req: Request) {
  const guard = await uploadGuard();
  if (!guard.ok) return guard.res;
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { key, uploadId, parts, filename, durationSec } = parsed.data;
  const storage = getStorage();

  try {
    await storage.completeUpload(key, { uploadId, parts });
  } catch (err) {
    console.error("[video] complete failed", err);
    return Response.json({ error: "Couldn't finish the upload. Please try again." }, { status: 502 });
  }

  const head = await storage.head(key);
  if (!head) return Response.json({ error: "Upload not found." }, { status: 404 });
  const max = getEnv().UPLOAD_MAX_VIDEO_MB * 1024 * 1024;
  const start = await storage.readStart(key, 4100);
  const kind = start ? await sniff(start) : null;
  if (head.size > max || !kind || !kind.ok || kind.kind !== "video") {
    await storage.delete(key).catch(() => undefined);
    return Response.json({ error: head.size > max ? "Video is too large." : "That file isn't an MP4 or WebM video." }, { status: 415 });
  }

  const existing = await prisma.media.findUnique({ where: { storageKey: key }, select: mediaSelect });
  if (existing) return Response.json({ media: existing });
  const media = await prisma.media.create({
    data: {
      type: "VIDEO",
      storageKey: key,
      url: storage.getUrl(key),
      mimeType: kind.mime,
      sizeBytes: head.size,
      durationSec: durationSec ?? null,
      alt: filename.replace(/\.[a-z0-9]+$/i, "").slice(0, 300),
      tags: [],
      uploadedById: guard.userId,
    },
    select: { ...mediaSelect, tags: true, createdAt: true },
  });
  await logActivity({ userId: guard.userId, action: "create", entityType: "Media", entityId: media.id, meta: { label: filename.slice(0, 120) } });
  return Response.json({ media }, { status: 201 });
}
