import {
  Activity,
  CalendarRange,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Newspaper,
  PlaySquare,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon; superAdminOnly?: boolean; section?: string };

/** Sidebar order (recognition model, A-76). */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/editions", label: "Editions", icon: CalendarRange, section: "Awards" },
  { href: "/admin/categories", label: "Genre categories", icon: LayoutGrid },
  { href: "/admin/honorees", label: "Honorees", icon: Trophy },
  { href: "/admin/artists", label: "Artists", icon: UserRound, section: "Content" },
  { href: "/admin/videos", label: "Videos", icon: PlaySquare },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/gallery", label: "Gallery", icon: Images },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/settings", label: "Site Settings", icon: Settings, superAdminOnly: true, section: "Admin" },
  { href: "/admin/users", label: "Staff", icon: ShieldCheck, superAdminOnly: true },
  { href: "/admin/activity", label: "Activity Log", icon: Activity },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
