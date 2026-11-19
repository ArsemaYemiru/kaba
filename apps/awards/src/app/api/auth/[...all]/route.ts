import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * Better Auth HTTP surface, reduced to an allow-list (A-45). Forms use Server
 * Actions (Turnstile, consent, rate limits) that call `auth.api` directly, so
 * the only public HTTP routes are OAuth (Google) and session reads.
 */
const ALLOWED = {
  GET: [/^\/api\/auth\/get-session$/, /^\/api\/auth\/callback\/google$/, /^\/api\/auth\/ok$/],
  POST: [/^\/api\/auth\/sign-in\/social$/, /^\/api\/auth\/callback\/google$/],
};

const handler = toNextJsHandler(auth);
const notFound = () => Response.json({ error: "Not found" }, { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(req: Request) {
  return ALLOWED.GET.some((r) => r.test(new URL(req.url).pathname)) ? handler.GET(req) : notFound();
}

export async function POST(req: Request) {
  return ALLOWED.POST.some((r) => r.test(new URL(req.url).pathname)) ? handler.POST(req) : notFound();
}
