import { connection } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { BALLOT_COOKIE, BALLOT_TTL_SECONDS, signBallotSession } from "@/server/voting/ballot-session";
import { ballotSessionAllowed, httpStatus } from "@/server/voting/cast";
import { json, sameOrigin, sessionUserId } from "@/server/voting/http";

const Body = z.object({ token: z.string().max(2048).default("") });

/** POST /api/ballot-session {token}: Turnstile → signed 30-minute ballot cookie for this member. */
export async function POST(req: Request) {
  await connection();
  if (!sameOrigin(req)) return json({ ok: false, reason: "FORBIDDEN" }, 403);
  const userId = await sessionUserId(req);
  const allowed = await ballotSessionAllowed(userId);
  if (!allowed.ok) return json(allowed, httpStatus(allowed.reason));
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success || !(await verifyTurnstile(body.data.token, await clientIp()))) return json({ ok: false, reason: "CAPTCHA" }, 400);
  const env = getEnv();
  const res = json({ ok: true });
  const secure = env.BETTER_AUTH_URL.startsWith("https://") ? "; Secure" : "";
  res.headers.append("set-cookie", `${BALLOT_COOKIE}=${signBallotSession(userId!, env.VOTE_HASH_SECRET)}; Path=/; Max-Age=${BALLOT_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure}`);
  return res;
}
