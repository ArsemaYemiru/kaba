import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";
import { getEnv } from "./env";

/**
 * Fixed-window rate limiter on the RateLimit table (D-9): one atomic upsert,
 * survives restarts, no Redis. Returns whether this hit is allowed.
 */
export async function hit(key: string, limit: number, windowSeconds: number) {
  const rows = await prisma.$queryRaw<{ points: number; expire: Date }[]>`
    INSERT INTO "RateLimit" ("key", "points", "expire")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "points" = CASE WHEN "RateLimit"."expire" < now() THEN 1 ELSE "RateLimit"."points" + 1 END,
      "expire" = CASE WHEN "RateLimit"."expire" < now() THEN EXCLUDED."expire" ELSE "RateLimit"."expire" END
    RETURNING "points", "expire"`;
  const row = rows[0]!;
  return { allowed: row.points <= limit, remaining: Math.max(0, limit - row.points), resetAt: row.expire };
}

/** Current count for a key without incrementing (0 when absent or expired). */
export async function peek(key: string): Promise<number> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row || !row.expire || row.expire < new Date()) return 0;
  return row.points;
}

export async function reset(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/**
 * Client IP. Only a header our own proxy sets can be trusted: in production
 * Nginx overwrites X-Real-IP (restored from CF-Connecting-IP for Cloudflare
 * ranges via real_ip), so clients can't spoof it. Client-supplied
 * CF-Connecting-IP / X-Forwarded-For are ignored in production.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  if (getEnv().NODE_ENV !== "production") {
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "dev";
  }
  return "unknown";
}

/** Raw IPs are never stored: HMAC with the app secret. */
export function hashIp(ip: string): string {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET).update(ip).digest("hex").slice(0, 32);
}
