import type { Metadata } from "next";

/** Open Graph + Twitter card for a page's share image (spec §10). */
export function shareImage(url: string, alt: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { images: [{ url, width: 1200, height: 630, alt }] },
    twitter: { card: "summary_large_image", images: [url] },
  };
}

/** Safe JSON-LD: escapes "<" so content can never close the script tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
