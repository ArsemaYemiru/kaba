import { cn } from "@/lib/utils";

/** "You've voted in 4 of 11 categories" with a segmented gold bar (spec §3.4). */
export function BallotProgress({ done, total, label, completeLabel, className }: { done: number; total: number; label: string; completeLabel?: string; className?: string }) {
  const complete = total > 0 && done >= total;
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <p className="font-display text-sm font-bold text-gold tabular-nums">
          {done}/{total}
        </p>
      </div>
      <div className="mt-3 flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-2 flex-1 rounded-full transition-colors duration-300", i < done ? "bg-gold shadow-[0_0_10px_-2px_rgba(255,184,0,0.8)]" : "bg-surface-2")} />
        ))}
      </div>
      {complete && completeLabel ? <p className="mt-3 text-xs text-muted-foreground">{completeLabel}</p> : null}
    </div>
  );
}
