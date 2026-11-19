import { siFacebook, siInstagram, siTelegram, siTiktok, siX, siYoutube } from "simple-icons";
import { cn } from "@/lib/utils";

// Brand glyphs from Simple Icons (CC0).
export const SOCIAL_PLATFORMS = {
  telegram: { label: "Telegram", icon: siTelegram },
  tiktok: { label: "TikTok", icon: siTiktok },
  youtube: { label: "YouTube", icon: siYoutube },
  instagram: { label: "Instagram", icon: siInstagram },
  facebook: { label: "Facebook", icon: siFacebook },
  x: { label: "X", icon: siX },
} as const;

export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;
export type SocialLinks = Partial<Record<SocialPlatform, string | null>>;

export function SocialIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-5 fill-current", className)}>
      <path d={SOCIAL_PLATFORMS[platform].icon.path} />
    </svg>
  );
}

/** Renders only platforms that have a URL; nothing when all are empty. */
export function SocialLinksRow({ links, className }: { links: SocialLinks; className?: string }) {
  const entries = (Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).filter((p) => links[p]);
  if (entries.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {entries.map((p) => (
        <li key={p}>
          <a
            href={links[p]!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={SOCIAL_PLATFORMS[p].label}
            className="flex size-11 items-center justify-center rounded-full border border-line text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
          >
            <SocialIcon platform={p} />
          </a>
        </li>
      ))}
    </ul>
  );
}
