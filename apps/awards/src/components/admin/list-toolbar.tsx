"use client";

import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type FilterDef = { param: string; label: string; options: { value: string; label: string }[] };

const STATUS_FILTER: FilterDef = {
  param: "status",
  label: "Status",
  options: [
    { value: "PUBLISHED", label: "Published" },
    { value: "DRAFT", label: "Draft" },
    { value: "ARCHIVED", label: "Archived" },
  ],
};

/** Search + filters for admin lists, synced to the URL (resets to page 1). */
export function ListToolbar({
  searchPlaceholder = "Search…",
  filters = [],
  withStatus = true,
  newHref,
  newLabel,
  extra,
}: {
  searchPlaceholder?: string;
  filters?: FilterDef[];
  withStatus?: boolean;
  newHref?: string;
  newLabel?: string;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const push = (patch: Record<string, string | null>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) qs.set(k, v);
      else qs.delete(k);
    }
    qs.delete("page");
    router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const all = withStatus ? [STATUS_FILTER, ...filters] : filters;
  const active = all.some((f) => params.get(f.param)) || !!params.get("q");

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <form
        role="search"
        className="relative w-full sm:w-64"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || null });
        }}
      >
        <label className="sr-only" htmlFor="admin-list-search">
          Search
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="admin-list-search"
          type="search"
          value={q}
          placeholder={searchPlaceholder}
          onChange={(e) => {
            setQ(e.target.value);
            window.clearTimeout(timer.current);
            const v = e.target.value;
            timer.current = window.setTimeout(() => push({ q: v.trim() || null }), 300);
          }}
          className="h-9 w-full rounded-md border border-line bg-surface pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:border-gold"
        />
      </form>
      {all.map((f) => (
        <label key={f.param} className="flex flex-col gap-1 text-xs text-muted-foreground">
          {f.label}
          <select
            value={params.get(f.param) ?? ""}
            onChange={(e) => push({ [f.param]: e.target.value || null })}
            className="h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-foreground"
          >
            <option value="">All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.replace(pathname, { scroll: false });
          }}
          className="inline-flex h-9 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" /> Clear
        </button>
      ) : null}
      <div className="ml-auto flex gap-2">
        {extra}
        {newHref ? (
          <Button asChild size="sm">
            <Link href={newHref}>
              <Plus /> {newLabel ?? "New"}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
