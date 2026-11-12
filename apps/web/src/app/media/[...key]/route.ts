import { Readable } from "node:stream";
import { getLocalStorage, IMMUTABLE } from "@/lib/storage";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  webm: "video/webm",
  vtt: "text/vtt",
};

/** Serves files for the local storage driver (spec §6), with Range support for video seeking. */
export async function GET(req: Request, ctx: RouteContext<"/media/[...key]">) {
  const local = getLocalStorage();
  if (!local) return new Response("Not found", { status: 404 });

  const { key } = await ctx.params;
  const joined = key.join("/");
  const meta = await local.head(joined).catch(() => null);
  if (!meta) return new Response("Not found", { status: 404 });

  const ext = joined.split(".").pop()?.toLowerCase() ?? "";
  const headers: Record<string, string> = {
    "content-type": TYPES[ext] ?? "application/octet-stream",
    "cache-control": IMMUTABLE,
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
  };

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    const size = meta.size;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } });
    }
    const file = await local.open(joined, { start, end });
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(Readable.toWeb(file.stream as Readable) as ReadableStream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }

  const file = await local.open(joined);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Readable.toWeb(file.stream as Readable) as ReadableStream, {
    headers: { ...headers, "content-length": String(file.size) },
  });
}
