import { createHmac } from "node:crypto";

/**
 * HMAC-SHA256 of an IP or user agent with VOTE_HASH_SECRET (spec §5.2).
 * Raw IPs are never stored; the same input always maps to the same hash so
 * the vote monitor can group by it.
 */
export function voteHash(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
