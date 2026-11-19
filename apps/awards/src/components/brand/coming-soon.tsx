import type { LucideIcon } from "lucide-react";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { TibebStrip } from "./tibeb";

/**
 * Branded placeholder used instead of broken embeds or empty sections
 * (spec §3.4), e.g. "Episode video coming soon".
 */
export function ComingSoon({
  title,
  body,
  label = "Coming soon",
  icon: Icon = Clapperboard,
  variant = "panel",
  action,
  className,
}: {
  title: string;
  body?: string;
  label?: string;
  icon?: LucideIcon;
  /** `player` keeps a 16:9 frame so it can stand in for a video. */
  variant?: "panel" | "player" | "compact";
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "grain relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-line bg-surface text-center",
        variant === "player" && "aspect-video w-full px-6",
        variant === "panel" && "px-6 py-14 sm:py-16",
        variant === "compact" && "px-5 py-8",
        className,
      )}
    >
      <div aria-hidden="true" className="glow-gold absolute top-1/2 left-1/2 size-[140%] -translate-1/2" />
      <span
        aria-hidden="true"
        lang="am"
        className="pointer-events-none absolute -bottom-[0.18em] left-1/2 -translate-x-1/2 font-ethiopic text-[clamp(7rem,20vw,14rem)] leading-none! font-black text-foreground/[0.035] select-none"
      >
        ፈታ
      </span>
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-gold/40 bg-bg/60 text-gold">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{label}</p>
        <h3 className={cn("mt-2 font-display font-bold text-balance", variant === "compact" ? "text-base" : "text-lg sm:text-xl")}>
          {title}
        </h3>
        {body ? <p className="mt-2 text-sm text-pretty text-muted-foreground">{body}</p> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
      <TibebStrip height={6} fade className="absolute inset-x-0 bottom-0 opacity-70" />
    </section>
  );
}
