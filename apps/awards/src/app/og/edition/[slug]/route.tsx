import { connection } from "next/server";
import { mediaDataUrl, ogCard } from "@/server/og/render";
import { ogEdition } from "@/server/og/data";

const PHASE: Record<string, string> = { DRAFT: "Coming soon", NOMINEES_ANNOUNCED: "Nominees announced", VOTING_OPEN: "Voting is open", VOTING_CLOSED: "Voting has closed", WINNERS_ANNOUNCED: "The winners" };

export async function GET(_req: Request, { params }: RouteContext<"/og/edition/[slug]">) {
  await connection();
  const e = await ogEdition((await params).slug);
  if (!e) return new Response("Not found", { status: 404 });
  return ogCard({ kicker: PHASE[e.phase] ?? "Feta Awards", title: e.nameEn, titleAm: e.nameAm, subtitle: "Celebrating Ethiopia's brightest stars", image: await mediaDataUrl(e.heroMedia), fallback: "ፈታ", winner: e.phase === "WINNERS_ANNOUNCED", sample: e.isSample });
}
