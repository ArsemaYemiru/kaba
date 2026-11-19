import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/styleguide", "/sign-in", "/sign-up"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
