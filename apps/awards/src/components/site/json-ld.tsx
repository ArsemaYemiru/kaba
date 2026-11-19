import { jsonLd } from "@/lib/seo";

/** Structured data (spec §10). Content is escaped so it can't break out of the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}
