import sharp from "sharp";
import { getStorage, IMMUTABLE } from "../storage";

export const IMAGE_WIDTHS = [400, 800, 1600] as const;

export type ProcessedImage = {
  /** Key of the largest variant; also the Media.storageKey. */
  storageKey: string;
  url: string;
  variants: Record<string, string>;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: "image/webp";
  blurDataUrl: string;
};

/**
 * Image pipeline (spec §6): auto-rotate, strip EXIF/GPS (sharp drops metadata
 * unless asked to keep it), convert to WebP, write 400/800/1600px widths
 * (never upscaled) and a tiny blur placeholder.
 */
export async function processImage(input: Buffer | Uint8Array, baseKey: string): Promise<ProcessedImage> {
  const storage = getStorage();
  const oriented = await sharp(input, { failOn: "error" }).rotate().toBuffer({ resolveWithObject: true });
  const srcWidth = oriented.info.width;

  // e.g. a 1000px source → 400, 800, 1000 (never upscaled).
  const widths = [...new Set(IMAGE_WIDTHS.map((w) => Math.min(w, srcWidth)))];

  const variants: Record<string, string> = {};
  let largest = { key: "", width: 0, height: 0, size: 0 };
  for (const w of widths) {
    const out = await sharp(oriented.data).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const key = `${baseKey}-${w}.webp`;
    await storage.put(key, out.data, { contentType: "image/webp", cacheControl: IMMUTABLE });
    variants[String(w)] = key;
    if (out.info.width >= largest.width) largest = { key, width: out.info.width, height: out.info.height, size: out.data.length };
  }

  const blur = await sharp(oriented.data).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();

  return {
    storageKey: largest.key,
    url: storage.getUrl(largest.key),
    variants,
    width: largest.width,
    height: largest.height,
    sizeBytes: largest.size,
    mimeType: "image/webp",
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}
