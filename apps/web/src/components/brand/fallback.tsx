import { gradientFor, initialsFor } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import { TibebCorner } from "./tibeb";

/**
 * Branded stand-in for anyone without an uploaded photo (spec rule 3, §3.4).
 * Deterministic gradient seeded from the name, initials in Unbounded.
 */
export function PortraitFallback({
  name,
  className,
  corner = false,
  size = "md",
}: {
  name: string;
  className?: string;
  corner?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const g = gradientFor(name);
  return (
    <div
      role="img"
      aria-label={name}
      className={cn("@container relative flex size-full items-center justify-center overflow-hidden", className)}
      style={{ background: g.css }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "font-display font-extrabold tracking-tight text-white/90 select-none",
          // Container queries: scale with the space the fallback actually has.
          size === "sm" && "text-xl",
          size === "md" && "text-2xl @[11rem]:text-3xl @[14rem]:text-4xl",
          size === "lg" && "text-3xl @[10rem]:text-4xl @[14rem]:text-5xl @[18rem]:text-6xl",
          size === "xl" && "text-6xl @[16rem]:text-8xl",
        )}
        style={{ textShadow: `0 0 40px ${g.accent}66` }}
      >
        {initialsFor(name)}
      </span>
      {corner ? <TibebCorner className="absolute top-0 left-0" /> : null}
    </div>
  );
}
