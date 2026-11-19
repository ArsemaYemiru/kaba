import { createElement } from "react";
import { Album, Award, Camera, Clapperboard, Crown, Disc3, Film, Laugh, Mic, MicVocal, Music, Smartphone, Sparkles, Star, Trophy, Tv, Users, type LucideIcon } from "lucide-react";

/** Allow-listed lucide icons admins can pick for a category (stored by name). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  trophy: Trophy, award: Award, crown: Crown, star: Star, mic: Mic, "mic-vocal": MicVocal, music: Music, "disc-3": Disc3,
  album: Album, clapperboard: Clapperboard, film: Film, tv: Tv, laugh: Laugh, sparkles: Sparkles, smartphone: Smartphone,
  camera: Camera, users: Users,
};

/** Renders an allow-listed category icon by name (Trophy when unknown). */
export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  return createElement((name && CATEGORY_ICONS[name]) || Trophy, { className, "aria-hidden": true });
}
