import { connection } from "next/server";
import { mediaDataUrl, ogCard } from "@/server/og/render";
import { ogEdition } from "@/server/og/data";

export async function GET(_req: Request, { params }: RouteContext<"/og/edition/[slug]">) {
  await connection();
  const e = await ogEdition((await params).slug);
  if (!e) return new Response("Not found", { status: 404 });
  const g = e._count.categories;
  return ogCard({ kicker: "Feta Awards", title: e.nameEn, titleAm: e.nameAm, subtitle: g ? `Celebrating Ethiopian artists across ${g} genre${g === 1 ? "" : "s"}` : "Celebrating Ethiopian artists", image: await mediaDataUrl(e.heroMedia), fallback: "ፈታ", sample: e.isSample });
}
