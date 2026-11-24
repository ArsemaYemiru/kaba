import { connection } from "next/server";
import { mediaDataUrl, ogCard } from "@/server/og/render";
import { ogHonoree } from "@/server/og/data";

/** "Honored · {genre} · Feta Awards {year}" (A-76). */
export async function GET(_req: Request, { params }: RouteContext<"/og/honoree/[slug]">) {
  await connection();
  const h = await ogHonoree((await params).slug);
  if (!h) return new Response("Not found", { status: 404 });
  const { edition } = h.category;
  return ogCard({
    kicker: `Honored · Feta Awards ${edition.year}`,
    title: h.displayNameEn,
    titleAm: h.displayNameAm,
    subtitle: `${h.category.nameEn}${h.workTitleEn ? ` · ${h.workTitleEn}` : ""}`,
    image: await mediaDataUrl(h.image ?? h.artist.portrait),
    fallback: h.displayNameEn.split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(""),
  });
}
