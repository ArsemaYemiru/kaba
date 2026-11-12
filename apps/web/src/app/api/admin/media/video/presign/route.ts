import { z } from "zod";
import { getEnv } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { datedKey, uploadGuard } from "@/server/admin/upload-guard";

const Input = z.object({
  filename: z.string().max(300),
  contentType: z.enum(["video/mp4", "video/webm"], { message: "Only MP4 and WebM videos are allowed." }),
  size: z.number().int().positive(),
});

/**
 * Step 1 of a direct video upload (spec §6). In production the browser uploads
 * straight to R2 (single PUT or multipart), bypassing Cloudflare's 100 MB
 * request limit; in development it PUTs to the dev-upload route.
 */
export async function POST(req: Request) {
  const guard = await uploadGuard();
  if (!guard.ok) return guard.res;
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const maxMb = getEnv().UPLOAD_MAX_VIDEO_MB;
  if (parsed.data.size > maxMb * 1024 * 1024) return Response.json({ error: `Videos can be at most ${maxMb} MB.` }, { status: 413 });

  const ext = parsed.data.contentType === "video/webm" ? "webm" : "mp4";
  const key = datedKey("uploads/videos", ext);
  const upload = await getStorage().createPresignedUpload(key, { contentType: parsed.data.contentType, sizeBytes: parsed.data.size });
  return Response.json({ key, upload });
}
