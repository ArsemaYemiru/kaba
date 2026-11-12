"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TibebStrip } from "@/components/brand/tibeb";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS } from "./nav-items";

/** Full-screen mobile menu (spec §3.5): focus-trapped dialog, Esc closes. */
export function MobileMenu() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when the route changes (derived state, no effect needed).
  if (open && pathname !== openedAt) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a,button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>("a,button"));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
      >
        <Menu className="size-6" />
      </Button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={t("menu")}
              className="grain fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-bg animate-in fade-in-0 duration-200 lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4">
                <Link href="/" aria-label="Feta Show home">
                  <Wordmark size="sm" />
                </Link>
                <Button variant="ghost" size="icon" aria-label={t("closeMenu")} onClick={() => setOpen(false)}>
                  <X className="size-6" />
                </Button>
              </div>
              <TibebStrip height={8} />
              <nav aria-label={t("mainNav")} className="relative z-10 flex-1 px-6 py-8">
                <ul className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item, i) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.key} className="animate-in slide-in-from-bottom-2 fade-in-0 fill-mode-both" style={{ animationDelay: `${i * 35}ms` }}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block py-2.5 font-display text-3xl font-bold",
                            active ? "text-gold" : "text-foreground hover:text-gold",
                          )}
                        >
                          {t(item.key)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Button asChild size="lg" className="mt-8 w-full">
                  <Link href="/join">{t("join")}</Link>
                </Button>
              </nav>
              <span
                aria-hidden="true"
                lang="am"
                className="pointer-events-none fixed -right-4 -bottom-10 font-ethiopic text-[12rem] leading-none! font-black text-foreground/[0.04]"
              >
                ፈታ
              </span>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
