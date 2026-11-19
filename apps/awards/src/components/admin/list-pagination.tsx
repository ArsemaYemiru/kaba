import Link from "next/link";
import { PAGE_SIZE } from "@/lib/admin-list";

/** Prev/next for admin lists; keeps the other query params. */
export function ListPagination({ basePath, params, page, total, pageSize = PAGE_SIZE }: { basePath: string; params: Record<string, string | string[] | undefined>; page: number; total: number; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v && k !== "page") qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    return qs.size ? `${basePath}?${qs}` : basePath;
  };
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      <span className="flex gap-3">
        {page > 1 ? (
          <Link className="font-semibold text-gold hover:underline" href={href(page - 1)}>
            ← Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="font-semibold text-gold hover:underline" href={href(page + 1)}>
            Next →
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
