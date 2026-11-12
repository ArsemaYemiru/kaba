"use client";

import { Command } from "cmdk";
import { Clapperboard, Newspaper, Search, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { SearchItem } from "@/server/queries/search";

const ICONS = { episode: Clapperboard, artist: UserRound, news: Newspaper } as const;

const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Word-prefix matching instead of cmdk's fuzzy subsequence score, so "mulatu"
 * doesn't match "Solomon Tekalign vs Berhanu Tesfaye". Every typed term must
 * start a word (or appear inside an Ethiopic name).
 */
function filter(value: string, search: string, keywords?: string[]): number {
  const terms = norm(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const hay = norm([value, ...(keywords ?? [])].join(" "));
  const words = hay.split(/[\s/&:'-]+/);
  let score = 0;
  for (const t of terms) {
    if (words.some((w) => w === t)) score += 2;
    else if (words.some((w) => w.startsWith(t))) score += 1;
    else if (/\p{Script=Ethiopic}/u.test(t) && hay.includes(t)) score += 1;
    else return 0;
  }
  return score / (terms.length * 2);
}

/** Header search: Ctrl/⌘+K or "/" opens a palette over episodes, artists and news. */
export function CommandSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [error, setError] = useState(false);

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
        void load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [load]);

  const groups = (["episode", "artist", "news"] as const).map((kind) => ({ kind, list: (items ?? []).filter((i) => i.kind === kind) }));

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("nav.openSearch")}
        aria-keyshortcuts="Control+K Meta+K /"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        onMouseEnter={() => void load()}
      >
        <Search className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[12vh] translate-y-0 gap-0 overflow-hidden border-line bg-surface p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">{t("nav.search")}</DialogTitle>
          <DialogDescription className="sr-only">{t("nav.openSearch")}</DialogDescription>
          <Command loop filter={filter} className="flex max-h-[min(70vh,32rem)] flex-col" label={t("nav.search")}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Command.Input
                autoFocus
                placeholder={t("search.placeholder")}
                className="h-14 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
              />
              <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground sm:inline">Esc</kbd>
            </div>
            <Command.List className="overflow-y-auto p-2">
              {!items && !error ? <Command.Loading>{<p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("search.loading")}</p>}</Command.Loading> : null}
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">{t("search.empty")}</Command.Empty>
              {groups.map(({ kind, list }) =>
                list.length ? (
                  <Command.Group
                    key={kind}
                    heading={t(`search.groups.${kind}`)}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-display [&_[cmdk-group-heading]]:text-[0.625rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-[0.25em] [&_[cmdk-group-heading]]:text-gold [&_[cmdk-group-heading]]:uppercase"
                  >
                    {list.map((item) => {
                      const Icon = ICONS[item.kind];
                      return (
                        <Command.Item
                          key={item.href}
                          value={`${item.title} ${item.href}`}
                          keywords={item.keywords}
                          onSelect={() => {
                            setOpen(false);
                            router.push(item.href);
                          }}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm data-[selected=true]:bg-surface-2 data-[selected=true]:text-gold"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                          {item.subtitle ? (
                            <span lang={/\p{Script=Ethiopic}/u.test(item.subtitle) ? "am" : undefined} className="shrink-0 text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ) : null,
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
