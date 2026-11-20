/**
 * Content Security Policy + security headers (spec §11). Shared by next.config.ts
 * (every response) and the proxy (auth/admin pages use frame-ancestors 'none').
 * Pages are cached and shared, so a per-request nonce isn't possible: scripts and
 * styles allow 'unsafe-inline' (Next inline bootstraps) but only from our origin
 * and the optional analytics host. No `@/` imports: this file
 * is loaded by next.config.ts.
 */
const origin = (u: string | undefined) => {
  try {
    return u ? new URL(u).origin : null;
  } catch {
    return null;
  }
};
const list = (...xs: (string | null | false | undefined)[]) => xs.filter(Boolean).join(" ");

export function contentSecurityPolicy(frameAncestors: "'self'" | "'none'" = "'self'") {
  const dev = process.env.NODE_ENV !== "production";
  const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  const r2 = origin(process.env.R2_PUBLIC_URL);
  const analytics = process.env.ANALYTICS_PROVIDER ? origin(process.env.ANALYTICS_SCRIPT_URL || (process.env.ANALYTICS_PROVIDER === "plausible" ? "https://plausible.io" : "https://cloud.umami.is")) : null;
  return [
    "default-src 'self'",
    `script-src ${list("'self'", "'unsafe-inline'", dev && "'unsafe-eval'", analytics)}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${list("'self'", "data:", "blob:", "https://i.ytimg.com", r2)}`,
    `media-src ${list("'self'", "blob:", r2)}`,
    "font-src 'self' data:",
    `connect-src ${list("'self'", "https://*.r2.cloudflarestorage.com", analytics, dev && "ws: wss:")}`,
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    !dev && https && "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

export function securityHeaders() {
  const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  ];
}
