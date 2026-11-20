import { connection } from "next/server";
import { ogCard } from "@/server/og/render";
import { ogCategory } from "@/server/og/data";

export async function GET(_req: Request, { params }: RouteContext<"/og/category/[edition]/[slug]">) {
  await connection();
  const { edition, slug } = await params;
  const c = await ogCategory(edition, slug);
  if (!c) return new Response("Not found", { status: 404 });
  const n = c._count.nominees;
  return ogCard({ kicker: `Feta Awards ${c.edition.year}`, title: c.nameEn, titleAm: c.nameAm, subtitle: n ? `Honoring ${n} artist${n === 1 ? "" : "s"}` : "Celebrating Ethiopian artists", fallback: "ፈታ", sample: c.isSample });
}
