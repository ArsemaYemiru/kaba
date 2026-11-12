import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Chip } from "./chip";
import { PortraitFallback } from "./fallback";
import { VsBadge } from "./vs-badge";

export type VsContestant = {
  name: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  blurDataUrl?: string | null;
};

export type VsCardProps = {
  a: VsContestant;
  b: VsContestant;
  title: string;
  typeLabel?: string;
  seasonLabel?: string;
  href?: string;
  size?: "mini" | "md" | "lg";
  priority?: boolean;
  className?: string;
};

/**
 * VS Card (spec §3.4): 16:9, A left / B right split by a diagonal slash,
 * centred VS badge, bottom overlay with type chip, season and title.
 * Hover: halves slide apart 6px, badge scales 1.08, gold edge glow.
 */
export function VsCard({ a, b, title, typeLabel, seasonLabel, href, size = "md", priority, className }: VsCardProps) {
  const sizes =
    size === "lg" ? "(min-width: 1024px) 50vw, 100vw" : size === "mini" ? "200px" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 85vw";

  const body = (
    <>
      {/* Side A: left 56%, right edge slants from 100% (top) to 78.6% (bottom) */}
      <div
        className="absolute inset-y-0 left-0 w-[56%] transition-transform duration-300 ease-out group-hover:-translate-x-1.5"
        style={{ clipPath: "polygon(0 0, 100% 0, 78.6% 100%, 0 100%)" }}
      >
        <Half c={a} sizes={sizes} priority={priority} size={size} align="left" />
      </div>
      {/* Side B: right 56%, left edge slants from 21.4% (top) to 0 (bottom) */}
      <div
        className="absolute inset-y-0 right-0 w-[56%] transition-transform duration-300 ease-out group-hover:translate-x-1.5"
        style={{ clipPath: "polygon(21.4% 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        <Half c={b} sizes={sizes} priority={priority} size={size} align="right" />
      </div>

      {/* Slash */}
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
        <line x1="56" y1="0" x2="44" y2="100" stroke="#0A0A0C" strokeWidth="6" vectorEffect="non-scaling-stroke" />
        <line x1="56" y1="0" x2="44" y2="100" stroke="#FFB800" strokeOpacity=".55" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className={cn("absolute left-1/2 -translate-x-1/2 -translate-y-1/2", size === "mini" ? "top-[40%]" : "top-[36%] @[22rem]:top-[42%]")}>
        <VsBadge size={size === "lg" ? "lg" : size === "mini" ? "sm" : "md"} fluid className="transition-transform duration-300 ease-out group-hover:scale-[1.08]" />
      </div>

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg via-bg/85 to-transparent px-3.5 pt-6 pb-3 @[22rem]:px-5 @[22rem]:pt-10 @[22rem]:pb-3.5">
        {typeLabel || seasonLabel ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2 @[22rem]:mb-2">
            {typeLabel ? <Chip size="sm">{typeLabel}</Chip> : null}
            {seasonLabel ? <span className="text-xs font-medium text-muted-foreground">{seasonLabel}</span> : null}
          </div>
        ) : null}
        <h3
          className={cn(
            "font-display font-bold text-balance text-foreground",
            size === "lg" && "text-xl leading-tight sm:text-h2",
            size === "md" && "text-sm leading-tight @[22rem]:text-base @[30rem]:text-lg",
            size === "mini" && "text-xs leading-tight",
          )}
        >
          {title}
        </h3>
      </div>
    </>
  );

  const frame = cn(
    "group @container relative block aspect-video w-full overflow-hidden rounded-lg border border-line bg-surface",
    "transition-[box-shadow,border-color,translate] duration-300 ease-out",
    "hover:-translate-y-0.5 hover:border-gold/70 hover:shadow-[0_0_0_1px_rgba(255,184,0,0.5),0_18px_50px_-18px_rgba(255,184,0,0.45)]",
    "focus-visible:border-gold/70",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={frame} aria-label={title}>
        {body}
      </Link>
    );
  }
  return <article className={frame} aria-label={title}>{body}</article>;
}

function Half({
  c,
  sizes,
  priority,
  size,
  align,
}: {
  c: VsContestant;
  sizes: string;
  priority?: boolean;
  size: NonNullable<VsCardProps["size"]>;
  align: "left" | "right";
}) {
  if (c.imageUrl) {
    return (
      <Image
        src={c.imageUrl}
        alt={c.imageAlt ?? c.name}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={c.blurDataUrl ? "blur" : "empty"}
        blurDataURL={c.blurDataUrl ?? undefined}
        className="object-cover"
      />
    );
  }
  return (
    <PortraitFallback
      name={c.name}
      size={size === "lg" ? "lg" : size === "mini" ? "sm" : "md"}
      className={cn("pb-[26%] @[22rem]:pb-[18%]", align === "left" ? "pr-[16%]" : "pl-[16%]")}
    />
  );
}
