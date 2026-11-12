import Image from "next/image";
import { cn } from "@/lib/utils";
import { HeroVideo } from "./hero-video";
import { Wordmark } from "./wordmark";

/**
 * Spotlight Hero (spec §3.4): ≥88vh stage with optional video or poster,
 * dark overlay, drifting conic "stage light" beams, giant ፈታ wordmark,
 * bilingual tagline, two CTAs and an optional "latest matchup" slot.
 */
export function SpotlightHero({
  taglineEn,
  taglineAm,
  posterUrl,
  posterBlur,
  videoUrl,
  actions,
  aside,
  asideLabel,
  className,
}: {
  taglineEn: string;
  taglineAm?: string;
  posterUrl?: string | null;
  posterBlur?: string | null;
  videoUrl?: string | null;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  asideLabel?: string;
  className?: string;
}) {
  return (
    <section
      className={cn("grain relative isolate flex min-h-[88svh] items-center overflow-hidden bg-bg", className)}
      aria-labelledby="hero-title"
    >
      {/* Media */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder={posterBlur ? "blur" : "empty"}
            blurDataURL={posterBlur ?? undefined}
            className="object-cover opacity-60"
          />
        ) : null}
        {videoUrl ? <HeroVideo src={videoUrl} poster={posterUrl ?? undefined} /> : null}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,12,0.55)_55%,var(--bg)_100%)]" />
        <div className="absolute inset-0 bg-linear-to-b from-bg/70 via-bg/30 to-bg" />
      </div>

      {/* Stage-light beams */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[30%] left-[8%] h-[150%] w-[38%] origin-top animate-beam bg-[conic-gradient(from_0deg_at_50%_0%,transparent_45%,rgba(255,184,0,0.20)_50%,transparent_55%)] blur-md" />
        <div className="absolute -top-[30%] right-[6%] h-[150%] w-[40%] origin-top animate-beam-slow bg-[conic-gradient(from_0deg_at_50%_0%,transparent_43%,rgba(255,255,255,0.09)_50%,transparent_57%)] blur-md" />
        <div className="absolute -top-[35%] left-[40%] h-[140%] w-[26%] origin-top animate-beam bg-[conic-gradient(from_0deg_at_50%_0%,transparent_44%,rgba(255,59,78,0.14)_50%,transparent_56%)] blur-lg [animation-delay:-7s]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-24 pb-28 text-center sm:px-6 lg:pb-32">
        <div aria-hidden="true" className="glow-gold absolute top-[38%] left-1/2 -z-10 size-[min(900px,130vw)] -translate-1/2" />
        <h1 id="hero-title">
          <span className="sr-only">Feta Show (ፈታ)</span>
          <Wordmark size="hero" />
        </h1>
        <p className="mt-8 max-w-xl text-lg font-medium text-balance text-foreground sm:text-xl">{taglineEn}</p>
        {taglineAm ? (
          <p lang="am" className="mt-2 text-base font-semibold text-gold sm:text-lg">
            {taglineAm}
          </p>
        ) : null}
        {actions ? <div className="mt-9 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
      </div>

      {aside ? (
        <aside
          aria-label={asideLabel}
          className="absolute right-6 bottom-8 z-10 hidden w-72 lg:block xl:right-10 xl:w-80"
        >
          {asideLabel ? (
            <p className="mb-2 font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{asideLabel}</p>
          ) : null}
          {aside}
        </aside>
      ) : null}
    </section>
  );
}
