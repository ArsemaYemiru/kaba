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

/** Serves files for the local storage driver (spec §6). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const local = getLocalStorage();
  if (!local) return new Response("Not found", { status: 404 });

  const { key } = await ctx.params;
  const joined = key.join("/");
  const file = await local.open(joined);
  if (!file) return new Response("Not found", { status: 404 });

  const ext = joined.split(".").pop()?.toLowerCase() ?? "";
  return new Response(Readable.toWeb(file.stream as Readable) as ReadableStream, {
    headers: {
      "content-type": TYPES[ext] ?? "application/octet-stream",
      "content-length": String(file.size),
      "cache-control": IMMUTABLE,
      "x-content-type-options": "nosniff",
    },
  });
}
