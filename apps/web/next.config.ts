import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Off: with it, unknown slugs stream a 200 fallback shell before notFound() runs (soft 404). D-37.
  partialPrefetching: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Local storage driver: originals are served from /media (R2 host added in Phase 5).
    localPatterns: [{ pathname: "/media/**" }],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600, 1920],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
