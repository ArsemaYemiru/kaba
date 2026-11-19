import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { TAGS } from "@/lib/cache-tags";
import { devToolsEnabled } from "@/server/dev/tools";
import { setSamplePhase } from "@/server/dev/phase";

const Body = z.object({ phase: z.enum(["DRAFT", "NOMINEES_ANNOUNCED", "VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"]) });
const notFound = () => new Response("Not found", { status: 404 });

/** Dev phase switcher (A-38). 404 unless dev tools are enabled on localhost. */
export async function POST(req: Request) {
  await connection();
  if (!devToolsEnabled()) return notFound();
  // Same-origin only: a cross-site form can't flip the phase.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return new Response("Forbidden", { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid phase" }, { status: 400 });
  const edition = await setSamplePhase(parsed.data.phase);
  for (const tag of [TAGS.editions, TAGS.edition(edition.slug), TAGS.artists, TAGS.settings]) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, phase: parsed.data.phase }, { headers: { "cache-control": "no-store" } });
}

export const GET = async () => {
  await connection();
  return devToolsEnabled() ? Response.json({ enabled: true }) : notFound();
};
