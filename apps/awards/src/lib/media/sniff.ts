import { fileTypeFromBuffer } from "file-type";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

export type SniffResult =
  | { ok: true; kind: "image" | "video"; mime: string; ext: string }
  | { ok: false; message: string };

/** Detect file type from magic bytes, never from the extension (spec §6). */
export async function sniff(buffer: Uint8Array): Promise<SniffResult> {
  const ft = await fileTypeFromBuffer(buffer);
  if (!ft) return { ok: false, message: "Unrecognised file. Upload a JPG, PNG, WebP or AVIF image, or an MP4/WebM video." };
  if ((IMAGE_TYPES as readonly string[]).includes(ft.mime)) return { ok: true, kind: "image", mime: ft.mime, ext: ft.ext };
  if ((VIDEO_TYPES as readonly string[]).includes(ft.mime)) return { ok: true, kind: "video", mime: ft.mime, ext: ft.ext };
  return { ok: false, message: `“${ft.mime}” files aren't allowed. Upload a JPG, PNG, WebP or AVIF image, or an MP4/WebM video.` };
}
