"use client";

import { useEffect, useState } from "react";

type NetworkInformation = { saveData?: boolean };

/**
 * Background video for the Spotlight Hero. Only mounts on ≥768px screens,
 * without Save-Data and without reduced motion; otherwise the poster shows
 * (spec §3.5, built for mobile data).
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Deferred so it never competes with the poster for LCP.
    const id = window.setTimeout(() => setPlay(wide && !calm && !conn?.saveData), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!play) return null;
  return (
    <video
      className="absolute inset-0 size-full object-cover"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
