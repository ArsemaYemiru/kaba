import { ArrowRight } from "lucide-react";
import { TibebStrip } from "@/components/brand/tibeb";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  kicker,
  title,
  titleAm,
  action,
  className,
}: {
  id?: string;
  kicker?: string;
  title: string;
  titleAm?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8", className)}>
      <div className="min-w-0">
        {kicker ? <p className="font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{kicker}</p> : null}
        <h2 id={id} className="mt-2 font-display text-h2 font-bold text-balance">
          {title}
        </h2>
        {titleAm ? (
          <p lang="am" className="mt-1 text-base font-semibold text-muted-foreground">
            {titleAm}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 rounded-full py-2 text-sm font-semibold text-gold hover:underline"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({ kicker, title, titleAm, intro, children }: { kicker?: string; title: string; titleAm?: string; intro?: string; children?: React.ReactNode }) {
  return (
    <header className="grain relative overflow-hidden border-b border-line">
      <div aria-hidden="true" className="glow-gold absolute -top-1/2 left-1/2 size-[min(900px,140vw)] -translate-x-1/2" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20 sm:pb-12">
        {kicker ? <p className="font-display text-xs font-bold tracking-[0.3em] text-gold uppercase">{kicker}</p> : null}
        <h1 className="mt-3 font-display text-h1 font-extrabold text-balance">{title}</h1>
        {titleAm ? (
          <p lang="am" className="mt-2 text-xl font-bold text-gold">
            {titleAm}
          </p>
        ) : null}
        {intro ? <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">{intro}</p> : null}
        {children}
      </div>
      <TibebStrip height={6} fade className="absolute inset-x-0 bottom-0 opacity-60" />
    </header>
  );
}
