import { cn } from "@/lib/utils";

/** Type-only logo: "ፈታ" in Ethiopic 900 with "FETA SHOW" in Unbounded beneath. */
export function Wordmark({
  size = "sm",
  className,
  subtitle = true,
}: {
  size?: "sm" | "md" | "hero";
  className?: string;
  subtitle?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      <span
        lang="am"
        className={cn(
          "font-ethiopic font-black text-foreground",
          size === "sm" && "text-[1.75rem] leading-none!",
          size === "md" && "text-5xl leading-none!",
          size === "hero" && "text-[clamp(6rem,4rem+14vw,13rem)] leading-[0.9]! drop-shadow-[0_0_60px_rgba(255,184,0,0.25)]",
        )}
      >
        ፈታ
      </span>
      {subtitle ? (
        <span
          className={cn(
            "font-display font-bold text-gold",
            size === "sm" && "mt-0.5 text-[0.5rem] tracking-[0.32em]",
            size === "md" && "mt-1 text-xs tracking-[0.4em]",
            size === "hero" && "mt-2 text-[clamp(0.9rem,0.7rem+1vw,1.5rem)] tracking-[0.5em]",
          )}
        >
          FETA SHOW
        </span>
      ) : null}
    </span>
  );
}
