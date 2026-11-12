import { defineRouting } from "next-intl/routing";

// Phase 7 adds "am". `as-needed` keeps English at "/" with no prefix.
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
