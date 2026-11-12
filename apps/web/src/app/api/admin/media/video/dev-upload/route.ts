import { getEnv } from "@/lib/env";
import { getLocalStorage } from "@/lib/storage";
import { uploadGuard } from "@/server/admin/upload-guard";

const KEY_RE = /^uploads\/videos\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(mp4|webm)$/;

/** Step 2 in development only: the "presigned" PUT target for the local driver. */
export async function PUT(req: Request) {
  const local = getLocalStorage();
  if (!local) return new Response("Not found", { status: 404 });
  const guard = await uploadGuard();
  if (!guard.ok) return guard.res;

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!KEY_RE.test(key)) return Response.json({ error: "Invalid key." }, { status: 400 });
  if (!req.body) return Response.json({ error: "Empty body." }, { status: 400 });
  const max = getEnv().UPLOAD_MAX_VIDEO_MB * 1024 * 1024;
  try {
    const size = await local.putStream(key, req.body, max);
    return Response.json({ ok: true, size });
  } catch (err) {
    if (err instanceof Error && err.message === "too-large") return Response.json({ error: "Video is too large." }, { status: 413 });
    console.error("[video] dev upload failed", err);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
