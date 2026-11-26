import Image from "next/image";
import { cn } from "@/lib/utils";
import fetaLogo from "./feta-logo.png";
import fetaMark from "./feta-mark.png";

/**
 * Official Feta Music Award logo (from feta.png):
 * - hero & md: full emblem + "FETA MUSIC AWARD" + Amharic tagline lockup
 * - sm: compact emblem beside crisp "FETA / MUSIC AWARD" typography for navbars
 */
export function Wordmark({
  size = "sm",
  className,
  subtitle = true,
  year,
  compact = false,
}: {
  size?: "sm" | "md" | "hero";
  className?: string;
  subtitle?: boolean;
  /** Edition year in gold foil (hero only). */
  year?: number | null;
  /** Show only the emblem mark (e.g., collapsed admin sidebar). */
  compact?: boolean;
}) {
  if (size === "hero") {
    return (
      <span className={cn("inline-flex flex-col items-center leading-none", className)}>
        <Image
          src={fetaLogo}
          alt=""
          priority
          sizes="(min-width: 768px) 340px, 240px"
          className="h-52 w-auto mix-blend-lighten drop-shadow-[0_0_48px_rgba(222,196,38,0.22)] sm:h-64 md:h-72"
        />
        {year ? (
          <span className="foil-text mt-3 font-display text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-none font-extrabold tracking-[0.12em] tabular-nums">
            {year}
          </span>
        ) : null}
      </span>
    );
  }

  if (size === "md") {
    return (
      <span className={cn("inline-flex flex-col items-center leading-none", className)}>
        <Image
          src={fetaLogo}
          alt="Feta Music Award"
          sizes="160px"
          className="h-28 w-auto mix-blend-lighten"
        />
        {year ? (
          <span className="foil-text mt-2 font-display text-lg leading-none font-extrabold tabular-nums">
            {year}
          </span>
        ) : null}
      </span>
    );
  }

  if (compact) {
    return (
      <Image
        src={fetaMark}
        alt=""
        sizes="36px"
        className={cn("h-9 w-auto shrink-0 mix-blend-lighten", className)}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2 leading-none", className)}>
      <Image
        src={fetaMark}
        alt=""
        priority
        sizes="32px"
        className="h-9 w-auto shrink-0 mix-blend-lighten"
      />
      <span className="inline-flex flex-col leading-none">
        <span className="font-display text-base font-extrabold tracking-[0.12em] text-foreground">
          FETA
        </span>
        {subtitle ? (
          <span className="mt-0.5 font-display text-[0.5rem] font-bold tracking-[0.26em] text-gold">
            MUSIC AWARD
          </span>
        ) : null}
      </span>
    </span>
  );
}
