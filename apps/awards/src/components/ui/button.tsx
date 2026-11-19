import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Studio Night: pill buttons. Primary = black text on gold (spec §3.2).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-gold active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gold text-bg shadow-[0_0_0_0_transparent] hover:bg-[#ffc933] hover:shadow-[0_0_32px_-6px_color-mix(in_oklab,var(--gold)_70%,transparent)]",
        outline:
          "border-line bg-transparent text-foreground hover:border-gold/60 hover:bg-surface-2",
        secondary: "bg-surface-2 text-foreground hover:bg-[#24242c]",
        ghost: "text-foreground hover:bg-surface-2",
        destructive: "bg-red text-bg hover:bg-[#ff5a6a]",
        link: "rounded-none px-0 text-gold underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
