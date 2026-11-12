"use client";

import { Command } from "cmdk";
import { ExternalLink, KeyRound, LogOut, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chip } from "@/components/brand/chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsFor } from "@/lib/gradient";
import { logout } from "@/server/actions/auth";
import { adminSearch, type AdminSearchHit } from "@/server/actions/search";
import { ADMIN_NAV } from "./nav";
import { NavList } from "./sidebar";

type Props = { name: string; email: string; role: "SUPER_ADMIN" | "EDITOR"; unread: number };

export function Topbar({ name, email, role, unread }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-bg/80 px-3 backdrop-blur-xl sm:px-5">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
        <Menu className="size-5" />
      </Button>
      <AdminSearch isSuperAdmin={isSuperAdmin} />
      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <a href="/" target="_blank" rel="noopener">
            View site <ExternalLink className="size-3.5" />
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${name}`}
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-2 font-display text-xs font-bold text-gold hover:border-gold/60"
            >
              {initialsFor(name)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 border-line bg-surface">
            <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
              <span className="font-semibold text-foreground">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
              <Chip size="sm" variant={isSuperAdmin ? "gold" : "default"} className="mt-1 w-fit">
                {isSuperAdmin ? "Super admin" : "Editor"}
              </Chip>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/change-password">
                <KeyRound /> Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="sm:hidden">
              <a href="/" target="_blank" rel="noopener">
                <ExternalLink /> View site
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut /> Log out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent showCloseButton={false} className="top-0 left-0 h-dvh max-w-72 translate-0 rounded-none border-r border-line bg-surface p-0 sm:max-w-72">
          <DialogTitle className="sr-only">Admin navigation</DialogTitle>
          <DialogDescription className="sr-only">Go to an admin section</DialogDescription>
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <span className="font-display text-sm font-bold">Feta Admin</span>
            <Button variant="ghost" size="icon-sm" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
              <X className="size-5" />
            </Button>
          </div>
          <nav aria-label="Admin" className="overflow-y-auto p-2">
            <NavList isSuperAdmin={isSuperAdmin} unread={unread} onNavigate={() => setMenuOpen(false)} />
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  );
}

/** ⌘K palette: jump to any admin section, or find content (incl. drafts) by title. */
function AdminSearch({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AdminSearchHit[]>([]);
  const router = useRouter();
  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void adminSearch(q).then((r) => !cancelled && setHits(r));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q]);
  const shownHits = q.trim().length < 2 ? [] : hits;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const items = ADMIN_NAV.filter((i) => !i.superAdminOnly || isSuperAdmin);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-muted-foreground hover:border-gold/50"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left">Search admin…</span>
        <kbd className="hidden rounded border border-line px-1.5 text-[0.625rem] sm:inline">Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[15vh] translate-y-0 gap-0 overflow-hidden border-line bg-surface p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search admin</DialogTitle>
          <DialogDescription className="sr-only">Jump to an admin section</DialogDescription>
          <Command loop label="Search admin" shouldFilter={false}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Go to a section, or search artists, episodes, news…" className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none" />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</Command.Empty>
              {shownHits.length ? (
                <Command.Group heading="Content" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.625rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gold [&_[cmdk-group-heading]]:uppercase">
                  {shownHits.map((h) => (
                    <Command.Item
                      key={h.href}
                      value={h.href}
                      onSelect={() => {
                        setOpen(false);
                        router.push(h.href);
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-2 data-[selected=true]:text-gold"
                    >
                      <span className="w-14 shrink-0 text-[0.6875rem] text-muted-foreground">{h.kind}</span>
                      <span className="min-w-0 flex-1 truncate">{h.title}</span>
                      {h.status !== "PUBLISHED" ? <span className="text-[0.6875rem] text-muted-foreground">{h.status.toLowerCase()}</span> : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              {items.filter((i) => !q.trim() || i.label.toLowerCase().includes(q.trim().toLowerCase())).map((i) => (
                <Command.Item
                  key={i.href}
                  value={i.label}
                  onSelect={() => {
                    setOpen(false);
                    router.push(i.href);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-2 data-[selected=true]:text-gold"
                >
                  <i.icon className="size-4" aria-hidden="true" /> {i.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
