import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const t = await getTranslations("common");
  const btn = "inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-gold/60";
  return (
    <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={btn} rel="prev">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("previous")}
        </Link>
      ) : (
        <span className={cn(btn, "pointer-events-none opacity-40")} aria-disabled="true">
          <ChevronLeft className="size-4" aria-hidden="true" /> {t("previous")}
        </span>
      )}
      <p className="text-sm text-muted-foreground tabular-nums">{t("page", { page, pages })}</p>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={btn} rel="next">
          {t("next")} <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(btn, "pointer-events-none opacity-40")} aria-disabled="true">
          {t("next")} <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
