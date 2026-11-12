"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Debounced search box that writes ?q= to the URL. Wrapped in a GET form, so
 * pressing Enter works even before hydration.
 */
export function SearchField({ label, placeholder, param = "q" }: { label: string; placeholder: string; param?: string }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get(param) ?? "";
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function push(next: string) {
    const qs = new URLSearchParams(params.toString());
    if (next.trim()) qs.set(param, next.trim());
    else qs.delete(param);
    qs.delete("page");
    const s = qs.toString();
    start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  return (
    <form
      role="search"
      action={pathname}
      onSubmit={(e) => {
        e.preventDefault();
        window.clearTimeout(timer.current);
        push(value);
      }}
      className="relative w-full sm:max-w-xs"
    >
      <label htmlFor={`search-${param}`} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={`search-${param}`}
        name={param}
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => push(v), 300);
        }}
        className="h-11 w-full rounded-full border border-line bg-surface pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-gold [&::-webkit-search-cancel-button]:hidden"
        aria-busy={pending}
      />
      {value ? (
        <button
          type="button"
          aria-label={tc("clearSearch")}
          onClick={() => {
            setValue("");
            push("");
          }}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </form>
  );
}
