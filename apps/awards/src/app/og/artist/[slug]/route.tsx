import { connection } from "next/server";
import { initialsOf, mediaDataUrl, ogCard } from "@/server/og/render";
import { ogArtist } from "@/server/og/data";

const CAT: Record<string, string> = { SINGER: "Singer", MUSICIAN: "Musician", ACTOR: "Actor", COMEDIAN: "Comedian", DANCER: "Dancer", PRODUCER_DJ: "Producer/DJ", HOST_MEDIA: "Host/Media" };

/** Artist card: English + Amharic name over the brand gradient (spec §10). */
export async function GET(_req: Request, { params }: RouteContext<"/og/artist/[slug]">) {
  await connection();
  const a = await ogArtist((await params).slug);
  if (!a) return new Response("Not found", { status: 404 });
  return ogCard({
    kicker: a.isLegend ? "Legend of Ethiopian music" : "Ethiopian artists",
    title: a.nameEn,
    titleAm: a.nameAm,
    subtitle: a.categories.map((c) => CAT[c]).filter(Boolean).join(" · ") || null,
    image: await mediaDataUrl(a.portrait),
    fallback: initialsOf(a.nameEn),
  });
}
