import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./src/lib/csp";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: import.meta.dirname + "/../..",
  cacheComponents: true,
  // Share-image fonts are read from disk at runtime; ship them with the standalone build.
  outputFileTracingIncludes: { "/og/**": ["./assets/og-fonts/**"] },
  // Off so unknown slugs return a real 404 instead of a streamed 200 shell (A-14).
  partialPrefetching: false,
  // forbidden() for non-staff on admin pages and actions (real 403s, spec Gate 4).
  experimental: { authInterrupts: true },
  poweredByHeader: false,
  // Render metadata in <head> for every client (not streamed into <body>), so crawlers,
  // social scrapers and Lighthouse always see titles, descriptions and share images.
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/media/**" }],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600, 1920],
  },
};

export default withNextIntl(nextConfig);
