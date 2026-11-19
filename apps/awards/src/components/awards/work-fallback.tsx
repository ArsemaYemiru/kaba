import { Clapperboard, Disc3, Film, Sparkles, Tv, Users } from "lucide-react";
import { PortraitFallback } from "@/components/brand/fallback";
import { gradientFor } from "@/lib/gradient";
import { cn } from "@/lib/utils";

export type NomineeKind = "PERSON" | "GROUP" | "SONG" | "ALBUM" | "MUSIC_VIDEO" | "FILM" | "SERIES" | "CREATOR" | "OTHER";

const ICONS = { SONG: Disc3, ALBUM: Disc3, MUSIC_VIDEO: Clapperboard, FILM: Film, SERIES: Tv, GROUP: Users, CREATOR: Sparkles } as const;

/**
 * Fallback artwork (spec §3.4): people get initials on a seeded gradient;
 * works get a stylized disc/film icon on the same gradient.
 */
export function NomineeFallback({ name, type, className }: { name: string; type: NomineeKind; className?: string }) {
  if (type === "PERSON" || type === "OTHER" || type === "CREATOR") {
    return <PortraitFallback name={name} size="lg" corner className={cn("pb-[30%]", className)} />;
  }
  const Icon = ICONS[type as keyof typeof ICONS] ?? Disc3;
  const g = gradientFor(name);
  const spin = type === "SONG" || type === "ALBUM";
  return (
    <div role="img" aria-label={name} className={cn("relative flex size-full items-center justify-center overflow-hidden pb-[24%]", className)} style={{ background: g.css }}>
      <span aria-hidden="true" className="absolute aspect-square w-[70%] rounded-full border border-white/10" />
      <span aria-hidden="true" className="absolute aspect-square w-[46%] rounded-full border border-white/10" />
      <Icon aria-hidden="true" className={cn("relative aspect-square h-auto w-[34%] text-white/85", spin && "motion-safe:animate-[spin_24s_linear_infinite]")} strokeWidth={1.25} />
    </div>
  );
}
