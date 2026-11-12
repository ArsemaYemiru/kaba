import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Phase 4 adds the optimistic /admin session check here.
export default createMiddleware(routing);

export const config = {
  // Everything except admin, API, media, Next internals and files with an extension.
  matcher: ["/((?!api|admin|media|_next|_vercel|.*\\..*).*)"],
};
