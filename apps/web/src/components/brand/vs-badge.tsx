import { cn } from "@/lib/utils";

/** Round "VS" badge: red fill, gold ring, red glow (spec §3.4). */
export function VsBadge({ className, size = "md", fluid = false }: { className?: string; size?: "sm" | "md" | "lg"; fluid?: boolean }) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <span aria-hidden="true" className="glow-red absolute -inset-[80%] rounded-full" />
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full bg-red font-display font-extrabold text-bg ring-gold",
          size === "sm" && "size-9 text-[0.7rem] ring-2",
          size === "md" && !fluid && "size-14 text-base ring-[3px]",
          // Inside a VS card: follow the card width (@container on the card).
          size === "md" && fluid && "size-10 text-xs ring-2 @[22rem]:size-14 @[22rem]:text-base @[22rem]:ring-[3px]",
          size === "lg" && "size-14 text-base ring-[3px] sm:size-20 sm:text-2xl sm:ring-4 lg:size-24 lg:text-3xl",
        )}
      >
        VS
      </span>
    </span>
  );
}
