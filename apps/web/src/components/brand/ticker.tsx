import { cn } from "@/lib/utils";

/**
 * Marquee of matchups and CTAs: gold on black, ✦ separators, pauses on
 * hover/focus, static (and scrollable) under reduced motion (spec §3.4).
 */
export function Ticker({
  items,
  className,
  label = "Feta highlights",
  durationSeconds,
}: {
  items: string[];
  className?: string;
  label?: string;
  durationSeconds?: number;
}) {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  const duration = durationSeconds ?? Math.max(24, clean.join("").length * 0.28);

  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className={cn("flex shrink-0 items-center", hidden && "motion-reduce:hidden")}
    >
      {clean.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-center">
          <span className="px-5 font-display text-sm font-bold tracking-wide whitespace-nowrap text-gold uppercase sm:text-base">
            {item}
          </span>
          <span aria-hidden="true" className="text-red">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "pause-on-hover relative overflow-hidden border-y border-line bg-bg py-3.5 motion-reduce:overflow-x-auto",
        "mask-[linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]",
        className,
      )}
    >
      <div
        className="flex w-max animate-marquee motion-reduce:animate-none"
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
