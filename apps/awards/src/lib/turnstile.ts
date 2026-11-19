import "server-only";
import { getEnv } from "./env";

/**
 * Server-side Turnstile check for our own Server Actions (the Better Auth
 * captcha plugin only guards its HTTP endpoints). `TURNSTILE_BYPASS=1` is for
 * e2e/k6 and is rejected when APP_ENV=production (A-11).
 */
export function turnstileSiteKey(): string | null {
  const env = getEnv();
  return env.TURNSTILE_BYPASS === "1" ? null : env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const env = getEnv();
  if (env.TURNSTILE_BYPASS === "1" && env.APP_ENV !== "production") return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip && ip !== "dev" && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] siteverify failed", err);
    return false;
  }
}
