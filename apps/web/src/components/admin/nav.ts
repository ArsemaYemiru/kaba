import {
  Activity,
  Clapperboard,
  Image as ImageIcon,
  Images,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  PlaySquare,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon; superAdminOnly?: boolean; badge?: "submissions" };

/** Sidebar order from spec §5. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/episodes", label: "Episodes", icon: Clapperboard },
  { href: "/admin/artists", label: "Artists", icon: UserRound },
  { href: "/admin/videos", label: "Videos", icon: PlaySquare },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/gallery", label: "Gallery", icon: Images },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox, badge: "submissions" },
  { href: "/admin/settings", label: "Site Settings", icon: Settings, superAdminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, superAdminOnly: true },
  { href: "/admin/activity", label: "Activity Log", icon: Activity },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
