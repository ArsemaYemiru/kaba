import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const nav = createNavigation(routing);

/**
 * Locale-aware navigation. Public pages hold no per-visitor state any more
 * (no accounts or votes, A-77), so links prefetch normally again (A-71 superseded).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = nav;
