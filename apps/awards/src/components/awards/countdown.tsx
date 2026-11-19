"use client";

import { useEffect, useState } from "react";
import { formatEat, remaining, type Remaining } from "@/lib/time";
import { cn } from "@/lib/utils";

type Labels = { days: string; hours: string; minutes: string; seconds: string; eat: string };

/**
 * Countdown to the next milestone in East Africa Time (spec §3.4).
 * Server HTML shows the target date and placeholder digits (cached pages
 * never show stale numbers); ticking starts after mount. Under reduced
 * motion it updates once a minute instead of every second.
 */
export function Countdown({ target, label, labels, className, compact }: { target: string; label: string; labels: Labels; className?: string; compact?: boolean }) {
  const [r, setR] = useState<Remaining | null>(null);

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => setR(remaining(target));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, calm ? 60_000 : 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [target]);

  const units: [keyof Labels, number | undefined][] = [
    ["days", r?.days],
    ["hours", r?.hours],
    ["minutes", r?.minutes],
    ["seconds", r?.seconds],
  ];
  const when = formatEat(target);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <p className="font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{label}</p>
      <ol className="grid w-full grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
        {units.map(([k, v]) => (
          <li key={k} className={cn("flex flex-col items-center rounded-lg border border-line bg-surface/90", compact ? "px-1 py-2" : "px-2 py-3 sm:py-4")}>
            <span className={cn("font-display font-extrabold text-foreground tabular-nums", compact ? "text-xl" : "text-[clamp(1.5rem,1rem+2.5vw,2.75rem)] leading-none")}>
              {v === undefined ? "––" : String(v).padStart(2, "0")}
            </span>
            <span className="mt-1.5 text-[0.625rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{labels[k]}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        <time dateTime={target}>{when}</time> · {labels.eat}
      </p>
      <p className="sr-only">
        {label}: {when} {labels.eat}
      </p>
    </div>
  );
}
