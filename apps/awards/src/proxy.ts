import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { auth } from "./lib/auth";
import { contentSecurityPolicy } from "./lib/csp";
import { isAdminAction } from "./server/admin-actions";
import { checkPublicRoute } from "./server/queries/public-route";

const intl = createMiddleware(routing);
const INTERNAL = "x-feta-internal-404";
/** SUPER_ADMIN-only admin areas (spec §6). Editors get a real 403 here. */
const SUPER_ADMIN_ONLY = ["/admin/settings", "/admin/users"];

/** Pages that must never be cached or framed (spec §11, A-14). */
const AUTH_PAGES = new Set(["/sign-in", "/sign-up", "/verify", "/forgot-password", "/reset-password", "/two-factor"]);
const MEMBER_PAGES = ["/account", "/verify"];

/**
 * Real status codes before streaming (A-39, A-46):
 * - /admin: signed out → 307 to sign-in; member → 403; forced password change → 307.
 * - /account, /verify: signed out → 307 to sign-in.
 * - unknown or unpublished public routes → 404 (branded page); /awards → 307.
 * Pages, Server Actions and handlers re-check everything (lib/authz).
 */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return privateHeaders(await adminGate(req));
  // Admin Server Actions can be posted to any URL; gate them like /admin (A-47).
  if (req.method === "POST" && isAdminAction(req.headers.get("next-action"))) {
    const gate = await adminGate(req);
    if (gate.status !== 200) return privateHeaders(gate);
  }

  const prefixed = /^\/en(?=\/|$)/.test(pathname);
  let path = pathname.replace(/^\/en(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  try {
    path = decodeURIComponent(path);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }
  if (path === "/missing") return req.headers.get(INTERNAL) === "1" ? intl(req) : notFound(req);

  if (MEMBER_PAGES.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (!(await sessionUser(req))) {
      if (req.method !== "GET") return privateHeaders(await refuse(req, 401, "Unauthorized"));
      const url = new URL(`${prefixed ? "/en" : ""}/sign-in`, req.url);
      url.searchParams.set("next", path + req.nextUrl.search);
      return privateHeaders(NextResponse.redirect(url, 307));
    }
    return privateHeaders(intl(req));
  }
  if (AUTH_PAGES.has(path)) return privateHeaders(intl(req));

  const check = await checkPublicRoute(path).catch((err: unknown) => {
    console.error("[proxy] route check failed", err);
    return { ok: true } as const; // DB down → the page's own error UI handles it
  });
  if ("redirect" in check) return NextResponse.redirect(new URL((prefixed ? "/en" : "") + check.redirect, req.url), 307);
  if (!check.ok) return notFound(req);
  return intl(req);
}

type SessionUser = { role?: string; mustChangePassword?: boolean; isActive?: boolean; banned?: boolean | null };

async function sessionUser(req: NextRequest): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: req.headers, query: { disableCookieCache: true } }).catch(() => null);
  const u = s?.user as SessionUser | undefined;
  return u && u.isActive !== false && !u.banned ? u : null;
}

/** Answer a non-GET without reading it would make Node log an aborted stream; drain first. */
async function refuse(req: NextRequest, status: 401 | 403, message: string) {
  await req.arrayBuffer().catch(() => undefined);
  return new NextResponse(message, { status });
}

async function adminGate(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname.replace(/\/+$/, "") || "/admin";
  const nav = req.method === "GET" || req.method === "HEAD";
  if (path === "/admin/login") return NextResponse.redirect(new URL("/sign-in?next=/admin", req.url), 307);

  const user = await sessionUser(req);
  if (!user) {
    if (!nav) return refuse(req, 401, "Unauthorized");
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(url, 307);
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "EDITOR") {
    // Rewrites can't change the status, so answer directly with a real 403.
    return nav ? new NextResponse(FORBIDDEN_HTML, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } }) : refuse(req, 403, "Forbidden");
  }
  if (user.role !== "SUPER_ADMIN" && SUPER_ADMIN_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
    return nav ? new NextResponse(FORBIDDEN_HTML, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } }) : refuse(req, 403, "Forbidden");
  }
  if (user.mustChangePassword && path !== "/admin/change-password") {
    if (!nav) return refuse(req, 401, "Password change required");
    return NextResponse.redirect(new URL("/admin/change-password", req.url), 307);
  }
  return NextResponse.next();
}

function privateHeaders(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Content-Security-Policy", contentSecurityPolicy("'none'"));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "same-origin");
  return res;
}

let cached: { html: string; at: number } | null = null;

/** The branded not-found page, rendered by the app itself and cached for a minute. */
async function notFound(req: NextRequest) {
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex" };
  if (req.method !== "GET") return new NextResponse("Not found", { status: 404, headers });
  if (!cached || Date.now() - cached.at > 60_000) {
    try {
      const origin = process.env.INTERNAL_ORIGIN ?? req.nextUrl.origin;
      const res = await fetch(`${origin}/missing`, { headers: { [INTERNAL]: "1" }, cache: "no-store" });
      if (res.ok) cached = { html: await res.text(), at: Date.now() };
    } catch {
      // fall through to the minimal page
    }
  }
  return new NextResponse(cached?.html ?? FALLBACK_404, { status: 404, headers });
}

const FALLBACK_404 = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404 · Feta Awards</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0A0A0C;color:#F4F4F5;font:16px/1.6 system-ui,sans-serif}main{text-align:center;padding:24px}h1{color:#FFB800}a{color:#FFB800}</style></head>
<body><main><h1>Off the red carpet</h1><p>The page you're looking for isn't on tonight's programme.</p><a href="/">Back to home</a></main></body></html>`;

/** Self-contained branded 403 (no external assets). */
const FORBIDDEN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>403 · Not allowed · Feta Awards</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0A0A0C;color:#F4F4F5;font:16px/1.6 system-ui,sans-serif;padding:16px}
main{max-width:28rem;text-align:center}.b{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;background:#FF3B4E;color:#0A0A0C;font-weight:800;box-shadow:0 0 0 4px #FFB800}
h1{font-size:1.6rem;margin:24px 0 8px}p{color:#A1A1AA;margin:0}a{display:inline-block;margin-top:24px;color:#FFB800;font-weight:600}a:focus-visible{outline:2px solid #FFB800;outline-offset:3px}</style></head>
<body><main><span class="b" aria-hidden="true">403</span><h1>403 · Not allowed</h1><p>The admin is for Feta Awards staff. If you work on the awards, ask a super admin for access.</p><a href="/">Back to the site</a></main></body></html>`;

export const config = {
  // Everything except API, media, Next internals and files with an extension.
  matcher: ["/((?!api|media|og|_next|_vercel|.*\\..*).*)"],
};
