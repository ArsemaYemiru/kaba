import { createNavigation } from "next-intl/navigation";
import type { ComponentProps } from "react";
import { routing } from "./routing";

const nav = createNavigation(routing);

export const { redirect, usePathname, useRouter, getPathname } = nav;

/**
 * Locale-aware Link with prefetching OFF by default (A-71). Every public page
 * carries per-member state (vote buttons, header, ballot); a page prefetched
 * while signed out must never be shown after signing in. Navigation still
 * fetches fresh on click. Pass `prefetch` explicitly to opt back in.
 */
export function Link({ prefetch = false, ...props }: ComponentProps<typeof nav.Link>) {
  return <nav.Link prefetch={prefetch} {...props} />;
}
