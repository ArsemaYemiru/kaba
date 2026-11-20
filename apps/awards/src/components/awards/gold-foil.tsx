import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Round gold-foil trophy badge (archive years, brand accents; spec §3.2). */
export function TrophyBadge({ size = "md", label = "Feta Awards", className }: { size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "foil-bg inline-flex shrink-0 items-center justify-center rounded-full shadow-[0_0_24px_-4px_rgba(255,184,0,0.6)] ring-2 ring-bg",
        size === "sm" && "size-8",
        size === "md" && "size-11",
        size === "lg" && "size-16",
        className,
      )}
    >
      <Trophy aria-hidden="true" className={cn("text-bg", size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-8")} strokeWidth={2.4} />
    </span>
  );
}

export function FoilText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("foil-text", className)}>{children}</span>;
}
