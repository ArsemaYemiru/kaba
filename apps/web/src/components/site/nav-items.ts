export const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "episodes", href: "/episodes" },
  { key: "artists", href: "/artists" },
  { key: "videos", href: "/videos" },
  { key: "gallery", href: "/gallery" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
