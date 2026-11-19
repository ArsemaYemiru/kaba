import Image from "next/image";
import { Chip } from "@/components/brand/chip";
import { TibebStrip } from "@/components/brand/tibeb";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TrophyBadge } from "./gold-foil";
import { NomineeFallback, type NomineeKind } from "./work-fallback";

/** Winner Card (spec §3.4): gold-foil frame, trophy, category, winner, optional public vote %. */
export function WinnerCard({
  category,
  categoryAm,
  name,
  nameAm,
  credit,
  type,
  imageUrl,
  imageAlt,
  publicShare,
  href,
  sample,
  labels = { winner: "Winner", publicVote: "of the public vote", sample: "Sample" },
  className,
}: {
  category: string;
  categoryAm?: string | null;
  name: string;
  nameAm?: string | null;
  credit?: string | null;
  type: NomineeKind;
  imageUrl?: string | null;
  imageAlt?: string | null;
  /** 0–1; only passed when the edition shows public percentages. */
  publicShare?: number | null;
  href?: string;
  sample?: boolean;
  labels?: { winner: string; publicVote: string; sample: string };
  className?: string;
}) {
  const body = (
    <>
      <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-auto sm:min-h-72 sm:w-2/5 sm:self-stretch">
        {imageUrl ? <Image src={imageUrl} alt={imageAlt ?? name} fill sizes="(min-width: 640px) 25vw, 100vw" className="object-cover" /> : <NomineeFallback name={name} type={type} />}
        <TrophyBadge size="lg" label={labels.winner} className="absolute top-4 left-4" />
        {sample ? <Chip size="sm" variant="sample" className="absolute top-4 right-4">{labels.sample}</Chip> : null}
      </div>
      <div className="relative flex flex-1 flex-col justify-center gap-2 p-6 sm:p-8">
        <div aria-hidden="true" className="glow-gold absolute top-1/2 right-0 size-80 -translate-y-1/2 opacity-70" />
        <p className="relative text-xs font-bold tracking-[0.25em] text-gold uppercase">{category}</p>
        {categoryAm ? (
          <p lang="am" className="relative -mt-1 text-sm text-muted-foreground">
            {categoryAm}
          </p>
        ) : null}
        <p className="foil-text relative mt-2 font-display text-[0.6875rem] font-extrabold tracking-[0.35em] uppercase">{labels.winner}</p>
        <h3 className="relative font-display text-h2 leading-tight font-extrabold text-balance">{name}</h3>
        {nameAm ? (
          <p lang="am" className="relative text-lg font-bold text-gold">
            {nameAm}
          </p>
        ) : null}
        {credit ? <p className="relative text-sm text-muted-foreground">{credit}</p> : null}
        {publicShare !== null && publicShare !== undefined ? (
          <p className="relative mt-3 text-sm">
            <span className="font-display text-2xl font-extrabold text-gold tabular-nums">{Math.round(publicShare * 100)}%</span>{" "}
            <span className="text-muted-foreground">{labels.publicVote}</span>
          </p>
        ) : null}
        <TibebStrip height={6} className="relative mt-4 max-w-40 opacity-80" />
      </div>
    </>
  );
  const cls = cn("foil-frame group flex flex-col overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_rgba(255,184,0,0.5)] sm:min-h-72 sm:flex-row", className);
  return href ? (
    <Link href={href} className={cn(cls, "transition-transform duration-300 hover:-translate-y-0.5")}>
      {body}
    </Link>
  ) : (
    <article className={cls}>{body}</article>
  );
}
