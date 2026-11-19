import { connection } from "next/server";
import { ogCard } from "@/server/og/render";
import { ogCategory } from "@/server/og/data";

const HOW: Record<string, string> = { PUBLIC_VOTE: "Decided by your votes", HYBRID: "Public vote + jury", JURY: "Decided by the jury", HONORARY: "Honorary award" };

export async function GET(_req: Request, { params }: RouteContext<"/og/category/[edition]/[slug]">) {
  await connection();
  const { edition, slug } = await params;
  const c = await ogCategory(edition, slug);
  if (!c) return new Response("Not found", { status: 404 });
  const open = c.edition.phase === "VOTING_OPEN" && (c.votingType === "PUBLIC_VOTE" || c.votingType === "HYBRID");
  return ogCard({ kicker: `Feta Awards ${c.edition.year}`, title: c.nameEn, titleAm: c.nameAm, subtitle: open ? `${HOW[c.votingType]} · Vote now` : HOW[c.votingType], fallback: "ፈታ", sample: c.isSample });
}
