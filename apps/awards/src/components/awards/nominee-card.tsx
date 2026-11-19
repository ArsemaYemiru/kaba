import { Check, Lock } from "lucide-react";
import Image from "next/image";
import { Chip } from "@/components/brand/chip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TrophyBadge } from "./gold-foil";
import { NomineeFallback, type NomineeKind } from "./work-fallback";

export type NomineeCardProps = {
  name: string;
  nameAm?: string | null;
  type: NomineeKind;
  /** For work nominees: the work's title is the name; this is the credited artist. */
  credit?: string | null;
  categoryLabel?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  blurDataUrl?: string | null;
  href?: string;
  /** default · selected · disabled · winner (spec §3.4). */
  state?: "default" | "selected" | "disabled" | "winner";
  sample?: boolean;
  /** Replaces the default Vote button (Phase 5 wires the real voting control). */
  action?: React.ReactNode;
  labels?: { vote: string; yourVote: string; closed: string; winner: string; sample: string; by: (a: string) => string };
  sizes?: string;
  className?: string;
};

const DEFAULT_LABELS = { vote: "Vote", yourVote: "Your vote", closed: "Voting not open", winner: "Winner", sample: "Sample", by: (a: string) => `by ${a}` };

/**
 * Nominee Card (spec §3.4): 4:5 portrait or artwork, grayscale → colour on
 * hover, EN + AM name, work credit, category, Vote control and five states.
 */
export function NomineeCard({
  name,
  nameAm,
  type,
  credit,
  categoryLabel,
  imageUrl,
  imageAlt,
  blurDataUrl,
  href,
  state = "default",
  sample,
  action,
  labels = DEFAULT_LABELS,
  sizes = "(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw",
  className,
}: NomineeCardProps) {
  const selected = state === "selected";
  const winner = state === "winner";
  const disabled = state === "disabled";

  const control =
    action ??
    (winner ? null : selected ? (
      <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border-2 border-gold bg-gold/10 text-sm font-bold text-gold">
        <Check className="size-4" aria-hidden="true" /> {labels.yourVote}
      </span>
    ) : disabled ? (
      <span aria-disabled="true" className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-line text-xs font-semibold text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" /> {labels.closed}
      </span>
    ) : (
      <span className="flex h-10 w-full items-center justify-center rounded-full bg-gold text-sm font-bold text-bg">{labels.vote}</span>
    ));

  const media = (
    <div className="relative aspect-[4/5] overflow-hidden">
      <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03] [&_img]:grayscale [&_img]:transition-[filter] [&_img]:duration-500 group-hover:[&_img]:grayscale-0">
        {imageUrl ? (
          <Image src={imageUrl} alt={imageAlt ?? name} fill sizes={sizes} placeholder={blurDataUrl ? "blur" : "empty"} blurDataURL={blurDataUrl ?? undefined} className={cn("object-cover", (selected || winner) && "[filter:none]!")} />
        ) : (
          <NomineeFallback name={name} type={type} />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface via-surface/70 to-transparent pt-16" />
      <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">{sample ? <Chip size="sm" variant="sample">{labels.sample}</Chip> : null}</div>
      <div className="absolute top-3 right-3">
        {winner ? (
          <TrophyBadge size="md" label={labels.winner} />
        ) : selected ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-gold text-bg shadow-[0_0_20px_-2px_rgba(255,184,0,0.7)]" role="img" aria-label={labels.yourVote}>
            <Check className="size-5" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </div>
  );

  const info = (
    <div className="flex flex-col gap-1 px-4 pt-1">
      {categoryLabel ? <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-gold uppercase">{categoryLabel}</p> : null}
      <h3 className="font-display text-base leading-tight font-bold text-balance sm:text-lg">{name}</h3>
      {nameAm ? (
        <p lang="am" className="text-sm font-medium text-muted-foreground">
          {nameAm}
        </p>
      ) : null}
      {credit ? <p className="text-sm text-muted-foreground">{labels.by(credit)}</p> : null}
      {winner ? <p className="foil-text mt-1 font-display text-xs font-extrabold tracking-[0.3em] uppercase">{labels.winner}</p> : null}
    </div>
  );

  const frame = cn(
    "group relative flex h-full flex-col overflow-hidden rounded-lg border bg-surface transition-[border-color,box-shadow,translate] duration-300 ease-out",
    winner ? "foil-frame shadow-[0_24px_60px_-24px_rgba(255,184,0,0.55)]" : selected ? "border-gold ring-2 ring-gold/60" : "border-line hover:-translate-y-1 hover:border-gold/60",
    disabled && "opacity-95",
    className,
  );

  return (
    <article className={frame} aria-label={selected ? `${name} (${labels.yourVote})` : winner ? `${name} (${labels.winner})` : name}>
      {/* The link never wraps the control (a real Vote button can't sit inside an anchor). */}
      {href ? (
        <Link href={href} className="flex flex-col focus-visible:outline-offset-[-4px]">
          {media}
          {info}
        </Link>
      ) : (
        <>
          {media}
          {info}
        </>
      )}
      <div className="mt-auto px-4 pt-3 pb-4">{control}</div>
    </article>
  );
}
