import { cn } from "@/lib/utils";

/**
 * Tibeb strip: an original geometric border inspired by woven tibeb borders
 * (spec §3.2). One 48×14 tile repeated horizontally: green rails, gold
 * diamonds with a dark core, red lozenges and green chevron teeth.
 */
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 14" width="48" height="14">
<rect width="48" height="1.6" fill="#1FAA59"/><rect y="12.4" width="48" height="1.6" fill="#1FAA59"/>
<polygon points="12,2.6 16.6,7 12,11.4 7.4,7" fill="#FFB800"/>
<polygon points="12,5 14,7 12,9 10,7" fill="#0A0A0C"/>
<polygon points="36,4 39,7 36,10 33,7" fill="#FF3B4E"/>
<polygon points="22,2.6 26,2.6 24,5.2" fill="#1FAA59"/><polygon points="22,11.4 26,11.4 24,8.8" fill="#1FAA59"/>
<polygon points="46,2.6 50,2.6 48,5.2" fill="#1FAA59"/><polygon points="-2,2.6 2,2.6 0,5.2" fill="#1FAA59"/>
<polygon points="46,11.4 50,11.4 48,8.8" fill="#1FAA59"/><polygon points="-2,11.4 2,11.4 0,8.8" fill="#1FAA59"/>
<rect x="29" y="6.4" width="1.2" height="1.2" fill="#FFB800"/><rect x="41.8" y="6.4" width="1.2" height="1.2" fill="#FFB800"/>
</svg>`;

const TILE_URI = `url("data:image/svg+xml,${encodeURIComponent(TILE.replace(/\n/g, ""))}")`;

export function TibebStrip({
  className,
  height = 12,
  fade = false,
}: {
  className?: string;
  /** Strip height in px; the tile scales with it. */
  height?: number;
  /** Fade both ends into the background. */
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={cn("w-full", className)}
      style={{
        height,
        backgroundImage: TILE_URI,
        backgroundRepeat: "repeat-x",
        backgroundSize: `${(height / 14) * 48}px ${height}px`,
        backgroundPosition: "center",
        maskImage: fade ? "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)" : undefined,
      }}
    />
  );
}

/** Small tibeb corner used on fallback portraits. */
export function TibebCorner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={cn("pointer-events-none size-10", className)}
    >
      <path d="M0 0h40L0 40z" fill="#0A0A0C" opacity=".35" />
      <path d="M0 6h34M6 0v34" stroke="#1FAA59" strokeWidth="1.6" />
      <polygon points="12,8 16,12 12,16 8,12" fill="#FFB800" />
      <polygon points="24,6 26.5,8.5 24,11 21.5,8.5" fill="#FF3B4E" />
      <polygon points="6,21.5 8.5,24 6,26.5 3.5,24" fill="#FF3B4E" />
    </svg>
  );
}
