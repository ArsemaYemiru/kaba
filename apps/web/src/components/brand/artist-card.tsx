import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Chip } from "./chip";
import { PortraitFallback } from "./fallback";

export type ArtistCardProps = {
  nameEn: string;
  nameAm?: string | null;
  categories?: string[];
  imageUrl?: string | null;
  imageAlt?: string | null;
  blurDataUrl?: string | null;
  isLegend?: boolean;
  onFeta?: boolean;
  legendLabel?: string;
  onFetaLabel?: string;
  href?: string;
  className?: string;
  sizes?: string;
};

/**
 * Artist Card (spec §3.4): 3:4 portrait, grayscale → colour on hover,
 * English name (Unbounded) over Amharic name (Noto Sans Ethiopic),
 * category chips, Legend / On Feta badges, branded fallback.
 */
export function ArtistCard({
  nameEn,
  nameAm,
  categories = [],
  imageUrl,
  imageAlt,
  blurDataUrl,
  isLegend,
  onFeta,
  legendLabel = "Legend",
  onFetaLabel = "On Feta",
  href,
  className,
  sizes = "(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw",
}: ArtistCardProps) {
  const body = (
    <>
      <div className="absolute inset-0 transition-[filter,scale] duration-500 ease-out group-hover:scale-[1.03] [&_img]:grayscale [&_img]:transition-[filter] [&_img]:duration-500 group-hover:[&_img]:grayscale-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? nameEn}
            fill
            sizes={sizes}
            placeholder={blurDataUrl ? "blur" : "empty"}
            blurDataURL={blurDataUrl ?? undefined}
            className="object-cover"
          />
        ) : (
          <PortraitFallback name={nameEn} corner size="lg" className="pb-[55%]" />
        )}
      </div>

      {isLegend || onFeta ? (
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {isLegend ? <Chip variant="legend" size="sm">{legendLabel}</Chip> : null}
          {onFeta ? <Chip variant="red" size="sm">{onFetaLabel}</Chip> : null}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg via-bg/80 to-transparent px-4 pt-14 pb-4">
        <h3 className="font-display text-base leading-tight font-bold text-foreground sm:text-lg">{nameEn}</h3>
        {nameAm ? (
          <p lang="am" className="mt-0.5 text-sm font-medium text-muted-foreground">
            {nameAm}
          </p>
        ) : null}
        {categories.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Chip key={c} variant="muted" size="sm">
                {c}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );

  const frame = cn(
    "group relative block aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-surface",
    "transition-[box-shadow,border-color,translate] duration-300 ease-out",
    "hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_18px_50px_-20px_rgba(255,184,0,0.45)]",
    className,
  );

  return href ? (
    <Link href={href} className={frame}>
      {body}
    </Link>
  ) : (
    <article className={frame}>{body}</article>
  );
}
