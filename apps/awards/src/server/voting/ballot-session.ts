import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Ballot session (spec §5.2, A-11): after passing Turnstile the member gets a
 * signed, httpOnly cookie `{u: userId, e: expiry}` valid for 30 minutes.
 * Every vote must carry it and it must belong to the voting member.
 */
export const BALLOT_COOKIE = "feta_ballot";
export const BALLOT_TTL_SECONDS = 30 * 60;

const key = (secret: string) => createHmac("sha256", secret).update("feta-ballot-session-v1").digest();
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signBallotSession(userId: string, secret: string, now = Date.now()) {
  const payload = b64(JSON.stringify({ u: userId, e: now + BALLOT_TTL_SECONDS * 1000 }));
  const sig = b64(createHmac("sha256", key(secret)).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyBallotSession(token: string | undefined | null, userId: string, secret: string, now = Date.now()): boolean {
  if (!token || token.length > 512) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", key(secret)).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    return data.u === userId && typeof data.e === "number" && data.e > now;
  } catch {
    return false;
  }
}
