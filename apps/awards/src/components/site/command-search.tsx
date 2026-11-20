"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SearchItem } from "@/server/queries/search";

const CommandPalette = dynamic(() => import("./command-palette"), { ssr: false });

/** Header search: Ctrl/⌘+K or "/" opens a palette over honorees, artists and news. */
export function CommandSearch() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [error, setError] = useState(false);
  // Mount the palette (and download its code) only once someone opens it.
  const [opened, setOpened] = useState(false);

  const load = useCallback(async () => {
    if (items) return;
    try {
      const res = await fetch("/api/search");
      if (!res.ok) throw new Error(String(res.status));
      setItems((await res.json()) as SearchItem[]);
    } catch {
      setError(true);
    }
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
        setOpened(true);
        void load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [load]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("nav.openSearch")}
        aria-keyshortcuts="Control+K Meta+K /"
        onClick={() => {
          setOpen(true);
          setOpened(true);
          void load();
        }}
        onMouseEnter={() => void load()}
      >
        <Search className="size-5" />
      </Button>
      {opened ? <CommandPalette open={open} setOpen={setOpen} items={items} error={error} /> : null}
    </>
  );
}
