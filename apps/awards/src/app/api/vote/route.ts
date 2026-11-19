import { connection } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/rate-limit";
import { BALLOT_COOKIE } from "@/server/voting/ballot-session";
import { castVote, httpStatus } from "@/server/voting/cast";
import { cookieValue, json, sameOrigin, sessionUserId } from "@/server/voting/http";

const Body = z.object({ categoryId: z.string().max(40), nomineeId: z.string().max(40) });

/** POST /api/vote (same core as the site's Server Action; used by the k6 load test). Never returns counts. */
export async function POST(req: Request) {
  await connection();
  if (!sameOrigin(req)) return json({ ok: false, reason: "FORBIDDEN" }, 403);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ ok: false, reason: "INVALID" }, 400);
  const result = await castVote({
    userId: await sessionUserId(req),
    categoryId: body.data.categoryId,
    nomineeId: body.data.nomineeId,
    ballotToken: cookieValue(req, BALLOT_COOKIE),
    ip: await clientIp(),
    ua: req.headers.get("user-agent") ?? "",
  });
  return json(result, result.ok ? 200 : httpStatus(result.reason));
}
