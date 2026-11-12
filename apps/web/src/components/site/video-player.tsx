"use client";

import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { PlayCircle } from "lucide-react";
import { ComingSoon } from "@/components/brand/coming-soon";
import { youtubeId } from "@/lib/youtube";

export type PlayableSource = {
  source: "NONE" | "YOUTUBE" | "UPLOAD";
  youtubeUrl?: string | null;
  fileUrl?: string | null;
  fileMime?: string | null;
  posterUrl?: string | null;
  captionsUrl?: string | null;
};

/**
 * Episode/video player (spec §4.2): YouTube via a lightweight facade (no
 * iframe until clicked), uploaded MP4/WebM via native <video>, otherwise a
 * branded coming-soon panel. Never a broken embed.
 */
export function VideoPlayer({
  title,
  src,
  comingSoon,
  autoPlay,
}: {
  title: string;
  src: PlayableSource;
  comingSoon: { label: string; title: string; body: string };
  autoPlay?: boolean;
}) {
  const ytId = src.source === "YOUTUBE" ? youtubeId(src.youtubeUrl) : null;

  if (ytId) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-bg [&_.yt-lite]:rounded-lg">
        <LiteYouTubeEmbed id={ytId} title={title} noCookie poster="hqdefault" webp alwaysLoadIframe={autoPlay} params="rel=0" />
      </div>
    );
  }

  if (src.source === "UPLOAD" && src.fileUrl) {
    return (
      <video
        className="aspect-video w-full rounded-lg border border-line bg-bg"
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        poster={src.posterUrl ?? undefined}
        aria-label={title}
      >
        <source src={src.fileUrl} type={src.fileMime ?? undefined} />
        {src.captionsUrl ? <track kind="captions" src={src.captionsUrl} srcLang="en" label="English" default /> : null}
      </video>
    );
  }

  return <ComingSoon variant="player" icon={PlayCircle} label={comingSoon.label} title={comingSoon.title} body={comingSoon.body} />;
}
