import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatEat } from "@/lib/time";
import { cn } from "@/lib/utils";

type E = { ceremonyAt: Date | null; venue: string | null; broadcastPartner: string | null };

/** Awards night, venue and broadcast partner in East Africa Time; unknown values say "To be confirmed" (never invented). */
export async function KeyDates({ edition, className }: { edition: E; className?: string }) {
  const [t, tc] = await Promise.all([getTranslations("awards"), getTranslations("common")]);
  const rows: [string, string][] = [
    [t("ceremony"), edition.ceremonyAt ? `${formatEat(edition.ceremonyAt)} ${tc("eat")}` : tc("tbc")],
    [t("venue"), edition.venue ?? tc("tbc")],
    ...(edition.broadcastPartner ? [[t("broadcast"), edition.broadcastPartner] as [string, string]] : []),
  ];
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-line bg-surface p-4">
          <dt className="flex items-center gap-2 font-display text-[0.625rem] font-bold tracking-[0.25em] text-gold uppercase">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {k}
          </dt>
          <dd className="mt-1.5 text-sm font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
