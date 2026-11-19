import "server-only";
import { auth } from "@/lib/auth";

/** Same-origin JSON endpoints only (browsers send Origin on POST; the load test sets it). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function sessionUserId(req: Request): Promise<string | null> {
  const s = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  return s?.user.id ?? null;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "private, no-store" } });

export function cookieValue(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}
