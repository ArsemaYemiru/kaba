import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icons";

export type CategoryCardProps = {
  name: string;
  nameAm?: string | null;
  icon?: string | null;
  description?: string | null;
  honoreeCountLabel: string;
  href: string;
  className?: string;
};

/** Genre card (A-76): icon, EN/AM name, short description, honoree count. */
export function CategoryCard({ name, nameAm, icon, description, honoreeCountLabel, href, className }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface p-5 transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_18px_50px_-24px_rgba(255,184,0,0.45)]",
        className,
      )}
    >
      <div aria-hidden="true" className="glow-gold absolute -top-16 -right-16 size-48 opacity-60 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl border border-gold/30 bg-bg/60 text-gold">
          <CategoryIcon name={icon} className="size-6" />
        </span>
      </div>
      <h3 className="relative mt-5 font-display text-lg leading-tight font-bold text-balance">{name}</h3>
      {nameAm ? (
        <p lang="am" className="relative mt-1 text-sm font-medium text-muted-foreground">
          {nameAm}
        </p>
      ) : null}
      {description ? <p className="relative mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
      <div className="relative mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
        <span className="text-muted-foreground">{honoreeCountLabel}</span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold" aria-hidden="true" />
      </div>
    </Link>
  );
}
