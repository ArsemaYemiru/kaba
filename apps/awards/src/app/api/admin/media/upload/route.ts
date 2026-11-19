import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { processImage } from "@/lib/media/process-image";
import { sniff } from "@/lib/media/sniff";
import { datedKey, uploadGuard } from "@/server/admin/upload-guard";
import { mediaSelect } from "@/server/queries/media";

/**
 * Image upload (spec §6): one file per request (so the browser can show
 * per-file progress). Type is checked by magic bytes; sharp strips metadata
 * and writes WebP variants under a random UUID key.
 */
export async function POST(req: Request) {
  const guard = await uploadGuard();
  if (!guard.ok) return guard.res;

  const maxBytes = getEnv().UPLOAD_MAX_IMAGE_MB * 1024 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes + 64 * 1024) return Response.json({ error: `Images can be at most ${getEnv().UPLOAD_MAX_IMAGE_MB} MB.` }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Send the image as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });
  if (file.size > maxBytes) return Response.json({ error: `Images can be at most ${getEnv().UPLOAD_MAX_IMAGE_MB} MB.` }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = await sniff(buffer);
  if (!kind.ok) return Response.json({ error: kind.message }, { status: 415 });
  if (kind.kind !== "image") return Response.json({ error: "Videos are uploaded with the video uploader." }, { status: 415 });

  try {
    const img = await processImage(buffer, datedKey("uploads/images"));
    const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
    const media = await prisma.media.create({
      data: {
        type: "IMAGE",
        storageKey: img.storageKey,
        url: img.url,
        variants: img.variants,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        width: img.width,
        height: img.height,
        blurDataUrl: img.blurDataUrl,
        alt,
        tags: [],
        uploadedById: guard.userId,
      },
      select: { ...mediaSelect, tags: true, createdAt: true },
    });
    await logActivity({ userId: guard.userId, action: "create", entityType: "Media", entityId: media.id, meta: { label: file.name.slice(0, 120) } });
    return Response.json({ media }, { status: 201 });
  } catch (err) {
    console.error("[upload] image processing failed", err);
    return Response.json({ error: "Couldn't process that image. Is the file complete?" }, { status: 422 });
  }
}
