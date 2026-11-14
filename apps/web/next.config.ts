import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// R2 public bucket host for next/image (production storage driver).
const r2 = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: import.meta.dirname + "/../..",
  cacheComponents: true,
  // Off: with it, unknown slugs stream a 200 fallback shell before notFound() runs (soft 404). D-37.
  partialPrefetching: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Local driver: /media; R2 driver: the public bucket host below.
    localPatterns: [{ pathname: "/media/**" }],
    remotePatterns: r2 ? [{ protocol: r2.protocol.replace(":", "") as "https" | "http", hostname: r2.hostname, pathname: "/**" }] : [],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600, 1920],
  },
};

export default withNextIntl(nextConfig);
