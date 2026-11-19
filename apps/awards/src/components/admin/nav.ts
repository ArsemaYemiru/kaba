import {
  Activity,
  BarChart3,
  CalendarRange,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Newspaper,
  PlaySquare,
  Radar,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon; superAdminOnly?: boolean; badge?: "monitor"; section?: string };

/** Sidebar order from spec §6. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/editions", label: "Editions", icon: CalendarRange, section: "Awards" },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/nominees", label: "Nominees", icon: Trophy },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
  { href: "/admin/members", label: "Members", icon: Users, section: "Voting" },
  { href: "/admin/monitor", label: "Vote monitor", icon: Radar, badge: "monitor" },
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
