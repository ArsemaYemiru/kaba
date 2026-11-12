import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { auth } from "./lib/auth";

const intl = createMiddleware(routing);

/** SUPER_ADMIN-only areas (spec §5). Editors get a real 403 here. */
const SUPER_ADMIN_ONLY = ["/admin/users", "/admin/settings"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return withAdminHeaders(await adminGate(req));
  return intl(req);
}

/**
 * Early admin gate so status codes are real (streamed pages always start
 * with 200). Pages, Server Actions and route handlers re-check via lib/authz.
 */
/**
 * Refuse a non-GET request. The body is drained first: answering before
 * reading it makes Node log an uncaught "aborted" error on the request stream.
 */
async function refuse(req: NextRequest, status: 401 | 403, message: string) {
  await req.arrayBuffer().catch(() => undefined);
  return new NextResponse(message, { status });
}

async function adminGate(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;
  const isLogin = path === "/admin/login";
  const isChangePassword = path === "/admin/change-password";
  const isNavigation = req.method === "GET" || req.method === "HEAD";

  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  const user = session?.user as { role?: string; mustChangePassword?: boolean; isActive?: boolean } | undefined;
  const signedIn = !!user && user.isActive !== false;

  if (!signedIn) {
    if (isLogin) return NextResponse.next();
    if (!isNavigation) return refuse(req, 401, "Unauthorized");
    const url = new URL("/admin/login", req.url);
    if (path !== "/admin") url.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (isLogin && isNavigation) return NextResponse.redirect(new URL("/admin", req.url));

  if (user.mustChangePassword && !isChangePassword && !isLogin) {
    if (!isNavigation) return refuse(req, 401, "Password change required");
    return NextResponse.redirect(new URL("/admin/change-password", req.url));
  }

  const superOnly = SUPER_ADMIN_ONLY.some((p) => path === p || path.startsWith(`${p}/`));
  if (superOnly && user.role !== "SUPER_ADMIN") {
    // Rewrites can't change the status, so answer directly with a real 403.
    return isNavigation
      ? new NextResponse(FORBIDDEN_HTML, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } })
      : refuse(req, 403, "Forbidden");
  }

  return NextResponse.next();
}

/** Self-contained branded 403 page (no external assets). */
const FORBIDDEN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>403 · Not allowed · Feta Admin</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0A0A0C;color:#F4F4F5;font:16px/1.6 system-ui,sans-serif;padding:16px}
main{max-width:28rem;text-align:center}.vs{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;background:#FF3B4E;color:#0A0A0C;font-weight:800;box-shadow:0 0 0 4px #FFB800}
h1{font-size:1.6rem;margin:24px 0 8px}p{color:#A1A1AA;margin:0}a{display:inline-block;margin-top:24px;color:#FFB800;font-weight:600}a:focus-visible{outline:2px solid #FFB800;outline-offset:3px}</style></head>
<body><main><span class="vs" aria-hidden="true">403</span><h1>403 · Not allowed</h1><p>This area is for super admins only. Ask a super admin if you need access.</p><a href="/admin">Back to dashboard</a></main></body></html>`;

function withAdminHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  // Everything except API, media, Next internals and files with an extension.
  matcher: ["/((?!api|media|_next|_vercel|.*\\..*).*)"],
};
