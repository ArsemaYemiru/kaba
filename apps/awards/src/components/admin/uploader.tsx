"use client";

import { CheckCircle2, CircleAlert, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import type { PickerMedia } from "@/server/actions/admin/media";

/** Not crypto.randomUUID(): browsers only expose it on HTTPS/localhost, and production runs on HTTP. */
let seq = 0;
const nextId = () => `u${Date.now().toString(36)}-${++seq}`;

type Item = { id: string; name: string; progress: number; status: "waiting" | "uploading" | "done" | "error"; error?: string };

const IMAGE_TYPES = { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"], "image/avif": [".avif"] };
const VIDEO_TYPES = { "video/mp4": [".mp4"], "video/webm": [".webm"] };

/** XHR so we get upload progress events. */
function send(method: string, url: string, body: XMLHttpRequestBodyInit, onProgress: (p: number) => void, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; text: string; etag: string | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText, etag: xhr.getResponseHeader("ETag") });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body);
  });
}

/**
 * Camera photos are often 20+ MB and 7000px tall, while the site never shows
 * more than 1600px. Shrink JPEGs in the browser first (keeping the EXIF
 * rotation), so uploads stay fast on slow connections and the server never
 * decodes huge originals. PNG/WebP/AVIF (logos, transparency) go up as they are.
 */
const MAX_EDGE = 3000;
export async function prepareImage(file: File): Promise<File> {
  if (file.type !== "image/jpeg" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // let the server decide (it re-checks and re-encodes everything)
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 4 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(jpe?g)$/i, "") + ".jpg", { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

/** At most a few uploads at once: dropping 60 photos must not swamp a small server. */
const MAX_PARALLEL = 3;
let running = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function uploadImage(original: File, onProgress: (p: number) => void, maxBytes: number): Promise<PickerMedia> {
  const file = await prepareImage(original);
  if (file.size > maxBytes) throw new Error(`Too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const fd = new FormData();
  fd.append("file", file);
  const r = await send("POST", "/api/admin/media/upload", fd, onProgress);
  const json = JSON.parse(r.text || "{}") as { media?: PickerMedia; error?: string };
  if (r.status >= 300 || !json.media) throw new Error(json.error ?? `Upload failed (${r.status})`);
  return json.media;
}

/** presign → PUT (single or multipart, straight to storage) → complete. */
async function uploadVideo(file: File, onProgress: (p: number) => void): Promise<PickerMedia> {
  const pre = await fetch("/api/admin/media/video/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  const p = (await pre.json()) as { key?: string; error?: string; upload?: { kind: "single"; url: string; headers: Record<string, string> } | { kind: "multipart"; uploadId: string; partSize: number; partUrls: string[] } };
  if (!pre.ok || !p.key || !p.upload) throw new Error(p.error ?? "Couldn't start the upload.");

  let completeBody: Record<string, unknown> = { key: p.key, filename: file.name };
  if (p.upload.kind === "single") {
    const r = await send("PUT", p.upload.url, file, onProgress, p.upload.headers);
    if (r.status >= 300) throw new Error(`Upload failed (${r.status})`);
  } else {
    const { partSize, partUrls, uploadId } = p.upload;
    const parts: { partNumber: number; etag: string }[] = [];
    const loaded = new Array(partUrls.length).fill(0);
    for (let i = 0; i < partUrls.length; i++) {
      const blob = file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize));
      const r = await send("PUT", partUrls[i]!, blob, (f) => {
        loaded[i] = f * blob.size;
        onProgress(loaded.reduce((a, b) => a + b, 0) / file.size);
      });
      if (r.status >= 300 || !r.etag) throw new Error(`Part ${i + 1} failed (${r.status}). Check the bucket CORS exposes ETag.`);
      parts.push({ partNumber: i + 1, etag: r.etag });
    }
    completeBody = { ...completeBody, uploadId, parts };
  }
  const duration = await videoDuration(file).catch(() => undefined);
  const done = await fetch("/api/admin/media/video/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...completeBody, durationSec: duration }) });
  const json = (await done.json()) as { media?: PickerMedia; error?: string };
  if (!done.ok || !json.media) throw new Error(json.error ?? "Couldn't finish the upload.");
  return json.media;
}

function videoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Number.isFinite(v.duration) ? v.duration : undefined);
    };
    v.onerror = () => resolve(undefined);
    v.src = URL.createObjectURL(file);
  });
}

/** Drag-and-drop multi-upload with per-file progress (spec §5/§6). */
export function Uploader({ accept = "both", onUploaded, maxImageMb = 40, maxVideoMb = 1024, compact }: { accept?: "image" | "video" | "both"; onUploaded: (m: PickerMedia) => void; maxImageMb?: number; maxVideoMb?: number; compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const onDrop = useCallback(
    (files: File[], rejected: { file: File; errors: readonly { message: string }[] }[]) => {
      for (const r of rejected) setItems((l) => [...l, { id: nextId(), name: r.file.name, progress: 0, status: "error", error: "Only JPG, PNG, WebP, AVIF images or MP4/WebM videos." }]);
      for (const file of files) {
        const id = nextId();
        const isVideo = file.type.startsWith("video/");
        // Big JPEGs are shrunk before upload, so only videos are rejected up front.
        if (isVideo && file.size > maxVideoMb * 1024 * 1024) {
          setItems((l) => [...l, { id, name: file.name, progress: 0, status: "error", error: `Too large (max ${maxVideoMb} MB).` }]);
          continue;
        }
        setItems((l) => [...l, { id, name: file.name, progress: 0, status: "waiting" }]);
        withSlot(() => {
          update(id, { status: "uploading" });
          const onProgress = (p: number) => update(id, { progress: p });
          return isVideo ? uploadVideo(file, onProgress) : uploadImage(file, onProgress, maxImageMb * 1024 * 1024);
        })
          .then((m) => {
            update(id, { progress: 1, status: "done" });
            onUploaded(m);
          })
          .catch((e: Error) => update(id, { status: "error", error: e.message }));
      }
    },
    [maxImageMb, maxVideoMb, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept === "image" ? IMAGE_TYPES : accept === "video" ? VIDEO_TYPES : { ...IMAGE_TYPES, ...VIDEO_TYPES },
    multiple: true,
  });

  return (
    <div>
      <div
        {...getRootProps({
          className: cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-bg text-center transition-colors hover:border-gold/60",
            compact ? "px-4 py-5" : "px-6 py-10",
            isDragActive && "border-gold bg-gold/5",
          ),
        })}
      >
        <input {...getInputProps({ "aria-label": "Upload files" })} />
        <UploadCloud className="size-6 text-gold" aria-hidden="true" />
        <p className="text-sm font-semibold">{isDragActive ? "Drop to upload" : "Drag files here or click to browse"}</p>
        <p className="text-xs text-muted-foreground">
          {accept !== "video" ? `Images: JPG, PNG, WebP, AVIF up to ${maxImageMb} MB (large photos are resized automatically). ` : ""}
          {accept !== "image" ? `Videos: MP4, WebM up to ${maxVideoMb} MB.` : ""}
        </p>
      </div>
      {items.length ? (
        <ul className="mt-3 flex flex-col gap-2" aria-live="polite">
          {items.map((i) => (
            <li key={i.id} className="rounded-md border border-line bg-surface px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                {i.status === "done" ? <CheckCircle2 className="size-4 text-green" aria-label="Uploaded" /> : i.status === "error" ? <CircleAlert className="size-4 text-red" aria-label="Failed" /> : null}
                <span className="min-w-0 flex-1 truncate">{i.name}</span>
                <span className="text-muted-foreground tabular-nums">{i.status === "error" ? i.error : i.status === "waiting" ? "Waiting…" : i.status === "uploading" && i.progress >= 1 ? "Processing…" : `${Math.round(i.progress * 100)}%`}</span>
              </div>
              {i.status === "uploading" ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(i.progress * 100)} aria-label={`Uploading ${i.name}`}>
                  <div className="h-full bg-gold transition-[width]" style={{ width: `${i.progress * 100}%` }} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
