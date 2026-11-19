/**
 * Dev tools (phase switcher) are on only with ENABLE_DEV_TOOLS=1 AND a
 * localhost site URL, so a production deployment can never expose them,
 * even if the flag leaks into its environment (A-38).
 */
export function devToolsEnabled(): boolean {
  if (process.env.ENABLE_DEV_TOOLS !== "1") return false;
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}
