"use server";

import { cookies, headers } from "next/headers";
import { getViewer } from "@/lib/authz";
import { getEnv } from "@/lib/env";
import { clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { BALLOT_COOKIE, BALLOT_TTL_SECONDS, signBallotSession } from "@/server/voting/ballot-session";
import { ballotSessionAllowed, castVote, type CastResult, type VoteRejection } from "@/server/voting/cast";

/** Vote from the site (spec §5.2). Same core as POST /api/vote. */
export async function vote(categoryId: string, nomineeId: string): Promise<CastResult> {
  const [viewer, jar, h, ip] = await Promise.all([getViewer(), cookies(), headers(), clientIp()]);
  return castVote({ userId: viewer?.id ?? null, categoryId, nomineeId, ballotToken: jar.get(BALLOT_COOKIE)?.value, ip, ua: h.get("user-agent") ?? "" });
}

/** Turnstile → 30-minute signed ballot session cookie bound to this member. */
export async function openBallotSession(token: string): Promise<{ ok: true } | { ok: false; reason: VoteRejection | "CAPTCHA" }> {
  const viewer = await getViewer();
  const allowed = await ballotSessionAllowed(viewer?.id ?? null);
  if (!allowed.ok) return allowed;
  if (!(await verifyTurnstile(typeof token === "string" ? token : "", await clientIp()))) return { ok: false, reason: "CAPTCHA" };
  const jar = await cookies();
  jar.set(BALLOT_COOKIE, signBallotSession(viewer!.id, getEnv().VOTE_HASH_SECRET), {
    httpOnly: true,
    secure: getEnv().BETTER_AUTH_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: BALLOT_TTL_SECONDS,
  });
  return { ok: true };
}
