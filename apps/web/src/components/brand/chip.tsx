import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Text colours are chosen for WCAG AA on each fill: dark text on red/gold/green.
const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap leading-none",
  {
    variants: {
      variant: {
        default: "border border-line bg-surface-2/90 text-foreground",
        muted: "border border-line bg-bg/60 text-muted-foreground backdrop-blur",
        gold: "bg-gold text-bg",
        legend: "border border-gold bg-bg/70 text-gold backdrop-blur",
        red: "bg-red text-bg",
        green: "bg-green text-bg",
      },
      size: {
        sm: "px-2 py-1 text-[0.6875rem]",
        md: "px-3 py-1.5 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Chip({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return <span className={cn(chipVariants({ variant, size }), className)} {...props} />;
}
