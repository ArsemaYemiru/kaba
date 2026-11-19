import Script from "next/script";
import { getEnv } from "@/lib/env";

/** Optional privacy-friendly analytics (spec §10): loads nothing unless configured. Never on the admin. */
export function Analytics() {
  const env = getEnv();
  if (!env.ANALYTICS_PROVIDER || !env.ANALYTICS_SITE_ID) return null;
  if (env.ANALYTICS_PROVIDER === "plausible") {
    return <Script defer data-domain={env.ANALYTICS_SITE_ID} src={env.ANALYTICS_SCRIPT_URL ?? "https://plausible.io/js/script.js"} strategy="afterInteractive" />;
  }
  return <Script defer data-website-id={env.ANALYTICS_SITE_ID} src={env.ANALYTICS_SCRIPT_URL ?? "https://cloud.umami.is/script.js"} strategy="afterInteractive" />;
}
