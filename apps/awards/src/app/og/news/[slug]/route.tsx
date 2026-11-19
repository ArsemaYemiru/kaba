import { connection } from "next/server";
import { mediaDataUrl, ogCard } from "@/server/og/render";
import { ogNews } from "@/server/og/data";

export async function GET(_req: Request, { params }: RouteContext<"/og/news/[slug]">) {
  await connection();
  const n = await ogNews((await params).slug);
  if (!n) return new Response("Not found", { status: 404 });
  const excerpt = n.excerptEn && n.excerptEn.length > 110 ? `${n.excerptEn.slice(0, 107)}…` : n.excerptEn;
  return ogCard({ kicker: "News", title: n.titleEn, titleAm: n.titleAm, subtitle: excerpt, image: await mediaDataUrl(n.cover), sample: n.isSample });
}
