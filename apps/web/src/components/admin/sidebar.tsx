"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TibebStrip } from "@/components/brand/tibeb";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, isActivePath } from "./nav";

const KEY = "feta-admin-sidebar";

export function NavList({ isSuperAdmin, unread, collapsed, onNavigate }: { isSuperAdmin: boolean; unread: number; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV.filter((i) => !i.superAdminOnly || isSuperAdmin).map((item) => {
        const active = isActivePath(pathname, item.href);
        const badge = item.badge === "submissions" && unread > 0 ? unread : null;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active ? "bg-surface-2 text-gold" : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active ? <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-gold" /> : null}
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
              {badge ? (
                <span
                  className={cn(
                    "ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-[0.6875rem] font-bold text-bg tabular-nums",
                    collapsed && "absolute top-1 right-1 ml-0",
                  )}
                  aria-label={`${badge} new`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Collapsible desktop sidebar (state remembered per browser). */
export function Sidebar({ isSuperAdmin, unread }: { isSuperAdmin: boolean; unread: number }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let v = false;
    try {
      v = localStorage.getItem(KEY) === "1";
    } catch {
      /* storage blocked */
    }
    const id = window.setTimeout(() => setCollapsed(v), 0);
    return () => window.clearTimeout(id);
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center", collapsed ? "justify-center" : "px-4")}>
        <Link href="/admin" aria-label="Admin dashboard" className="flex flex-col items-center gap-0.5">
          <Wordmark size="sm" subtitle={!collapsed} />
        </Link>
      </div>
      <TibebStrip height={4} />
      <nav aria-label="Admin" className="flex-1 overflow-y-auto p-2 pt-3">
        <NavList isSuperAdmin={isSuperAdmin} unread={unread} collapsed={collapsed} />
      </nav>
      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
