import { connection } from "next/server";
import { mediaDataUrl, ogCard } from "@/server/og/render";
import { ogNominee } from "@/server/og/data";

const VOTABLE = new Set(["PUBLIC_VOTE", "HYBRID"]);

/** "Vote for {name} · {category} · Feta Awards {year}" (spec §4.4); winner card once announced. No counts, ever. */
export async function GET(_req: Request, { params }: RouteContext<"/og/nominee/[slug]">) {
  await connection();
  const n = await ogNominee((await params).slug);
  if (!n) return new Response("Not found", { status: 404 });
  const { edition } = n.category;
  const winner = edition.phase === "WINNERS_ANNOUNCED" && n.isWinner;
  const title = n.workTitleEn ?? n.displayNameEn;
  return ogCard({
    kicker: winner ? `Winner · Feta Awards ${edition.year}` : edition.phase === "VOTING_OPEN" && VOTABLE.has(n.category.votingType) ? "Vote for" : `Nominee · Feta Awards ${edition.year}`,
    title,
    titleAm: n.workTitleEn ? n.workTitleAm : n.displayNameAm,
    subtitle: `${n.workTitleEn ? `${n.displayNameEn} · ` : ""}${n.category.nameEn} · Feta Awards ${edition.year}`,
    image: await mediaDataUrl(n.image),
    fallback: n.workTitleEn ? "ፈታ" : title.split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(""),
    winner,
    sample: n.isSample,
  });
}
