import { cn } from "@/lib/utils";
import { RelativeTime } from "./relative-time";

export type Phase = "DRAFT" | "NOMINEES_ANNOUNCED" | "VOTING_OPEN" | "VOTING_CLOSED" | "WINNERS_ANNOUNCED";

/**
 * Thin bar under the header reflecting the edition phase (spec §3.4),
 * e.g. "Voting is open · closes in 3 days".
 */
export function PhaseBanner({
  phase,
  label,
  next,
  action,
  className,
}: {
  phase: Phase;
  label: string;
  /** Milestone countdown text, e.g. { target, template: "closes in {time}" }. */
  next?: { target: string; template: string } | null;
  action?: React.ReactNode;
  className?: string;
}) {
  const live = phase === "VOTING_OPEN";
  return (
    <div role="status" className={cn("border-b border-line bg-surface", className)}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:px-6 sm:text-sm">
        <span className="inline-flex items-center gap-2 font-semibold">
          {live ? (
            <span aria-hidden="true" className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red shadow-[0_0_12px_rgba(255,59,78,0.9)]" />
            </span>
          ) : phase === "WINNERS_ANNOUNCED" ? (
            <span aria-hidden="true" className="foil-bg size-2.5 rounded-full" />
          ) : (
            <span aria-hidden="true" className="size-2.5 rounded-full bg-gold" />
          )}
          <span className={phase === "WINNERS_ANNOUNCED" ? "foil-text" : live ? "text-foreground" : "text-foreground"}>{label}</span>
        </span>
        {next ? (
          <span className="text-muted-foreground">
            · <RelativeTime target={next.target} template={next.template} />
          </span>
        ) : null}
        {action}
      </div>
    </div>
  );
}
