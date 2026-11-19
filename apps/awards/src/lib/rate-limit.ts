import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { Redis } from "ioredis";
import { prisma } from "./db";
import { getEnv } from "./env";

/**
 * Fixed-window rate limiter (spec §2, A-18): Postgres (one atomic upsert on
 * the RateLimit table) by default, Redis when REDIS_URL is set. Returns
 * whether this hit is allowed.
 */
let redis: Redis | null | undefined;
function client(): Redis | null {
  if (redis !== undefined) return redis;
  const url = getEnv().REDIS_URL;
  redis = url ? new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: true, lazyConnect: false }) : null;
  return redis;
}

// INCR + set expiry on the first hit, atomically; returns [count, ttlMs].
const LUA = `local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end return {c, redis.call('PTTL', KEYS[1])}`;

export async function hit(key: string, limit: number, windowSeconds: number) {
  const r = client();
  if (r) {
    const [points, ttl] = (await r.eval(LUA, 1, `rl:${key}`, String(windowSeconds * 1000))) as [number, number];
    return { allowed: points <= limit, remaining: Math.max(0, limit - points), resetAt: new Date(Date.now() + Math.max(0, ttl)) };
  }
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
  const r = client();
  if (r) return Number((await r.get(`rl:${key}`)) ?? 0);
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row || !row.expire || row.expire < new Date()) return 0;
  return row.points;
}

export async function reset(key: string): Promise<void> {
  const r = client();
  if (r) await r.del(`rl:${key}`);
  else await prisma.rateLimit.deleteMany({ where: { key } });
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
  if (getEnv().APP_ENV !== "production") {
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "dev";
  }
  return "unknown";
}

/** Raw IPs are never stored: HMAC with the app secret. */
export function hashIp(ip: string): string {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET).update(ip).digest("hex").slice(0, 32);
}
