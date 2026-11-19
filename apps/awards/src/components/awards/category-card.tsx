import { ArrowRight, Check } from "lucide-react";
import { Chip } from "@/components/brand/chip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icons";

export type CategoryCardProps = {
  name: string;
  nameAm?: string | null;
  icon?: string | null;
  nomineeCountLabel: string;
  votingTypeLabel: string;
  votingType: "PUBLIC_VOTE" | "JURY" | "HYBRID" | "HONORARY";
  href: string;
  /** Signed-in member state for public-vote categories. */
  memberState?: "voted" | "notVoted" | null;
  labels?: { voted: string; voteNow: string };
  sample?: boolean;
  sampleLabel?: string;
  className?: string;
};

/** Category Card (spec §3.4): icon, EN/AM name, nominee count, voting type, member state. */
export function CategoryCard({ name, nameAm, icon, nomineeCountLabel, votingTypeLabel, votingType, href, memberState, labels = { voted: "Voted", voteNow: "Vote now" }, sample, sampleLabel = "Sample", className }: CategoryCardProps) {
  const voted = memberState === "voted";
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border bg-surface p-5 transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_18px_50px_-24px_rgba(255,184,0,0.45)]",
        voted ? "border-gold/50" : "border-line",
        className,
      )}
    >
      <div aria-hidden="true" className="glow-gold absolute -top-16 -right-16 size-48 opacity-60 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl border border-gold/30 bg-bg/60 text-gold">
          <CategoryIcon name={icon} className="size-6" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {sample ? <Chip size="sm" variant="sample">{sampleLabel}</Chip> : null}
          <Chip size="sm" variant={votingType === "HONORARY" ? "legend" : "default"}>
            {votingTypeLabel}
          </Chip>
        </div>
      </div>
      <h3 className="relative mt-5 font-display text-lg leading-tight font-bold text-balance">{name}</h3>
      {nameAm ? (
        <p lang="am" className="relative mt-1 text-sm font-medium text-muted-foreground">
          {nameAm}
        </p>
      ) : null}
      <div className="relative mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
        <span className="text-muted-foreground">{nomineeCountLabel}</span>
        {memberState ? (
          voted ? (
            <span className="inline-flex items-center gap-1 font-semibold text-gold">
              <Check className="size-4" aria-hidden="true" /> {labels.voted}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-red">
              {labels.voteNow} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          )
        ) : (
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold" aria-hidden="true" />
        )}
      </div>
    </Link>
  );
}
