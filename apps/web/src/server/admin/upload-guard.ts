import "server-only";
import { authorize } from "@/lib/authz";
import { hit } from "@/lib/rate-limit";

/** Auth + per-user upload rate limit for media route handlers. */
export async function uploadGuard(): Promise<{ ok: true; userId: string } | { ok: false; res: Response }> {
  const a = await authorize();
  if (!a.ok) return { ok: false, res: Response.json({ error: a.error }, { status: a.status }) };
  const limit = await hit(`upload:${a.user.id}`, 300, 60 * 60);
  if (!limit.allowed) return { ok: false, res: Response.json({ error: "Too many uploads this hour. Try again later." }, { status: 429 }) };
  return { ok: true, userId: a.user.id };
}

export function datedKey(prefix: string, ext?: string) {
  const d = new Date();
  const ym = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${prefix}/${ym}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
}
