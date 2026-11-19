import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Server-rendered filter chips: plain links, so filters work without JS. */
export function FilterChips({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string; active: boolean }[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {items.map((it) => (
          <li key={it.href} className="shrink-0">
            <Link
              href={it.href}
              scroll={false}
              aria-current={it.active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                it.active ? "border-gold bg-gold text-bg" : "border-line text-muted-foreground hover:border-gold/60 hover:text-foreground",
              )}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Build a query string from the current params with overrides (undefined removes). */
export function withParams(base: string, current: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const merged = { ...current, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}
