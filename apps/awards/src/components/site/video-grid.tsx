"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Chip } from "@/components/brand/chip";
import { gradientFor } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";
import type { VideoCardData } from "@/server/queries/videos";
import dynamic from "next/dynamic";

/** The player dialog (and the YouTube facade) loads only when a video is opened. */
const VideoModal = dynamic(() => import("./video-modal"), { ssr: false });

/** Video cards that open a modal player (spec §4.4). */
export function VideoGrid({ videos, className, layout = "grid" }: { videos: VideoCardData[]; className?: string; layout?: "grid" | "row" }) {
  const t = useTranslations();
  const [open, setOpen] = useState<VideoCardData | null>(null);

  return (
    <>
      <ul
        className={cn(
          layout === "grid"
            ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            : "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3",
          className,
        )}
      >
        {videos.map((v) => (
          <li key={v.id} className={cn(layout === "row" && "w-[82%] shrink-0 snap-start sm:w-auto")}>
            <VideoCard video={v} onOpen={() => setOpen(v)} typeLabel={t(`videos.types.${v.type}`)} soonLabel={t("common.comingSoon")} sampleLabel={t("nominee.sample")} playLabel={t("common.play", { title: v.titleEn })} />
          </li>
        ))}
      </ul>
      {open ? <VideoModal video={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function VideoCard({ video, onOpen, typeLabel, soonLabel, sampleLabel, playLabel }: { video: VideoCardData; onOpen: () => void; typeLabel: string; soonLabel: string; sampleLabel: string; playLabel: string }) {
  const yt = video.source === "YOUTUBE" ? youtubeId(video.youtubeUrl) : null;
  const poster = video.poster?.url ?? (yt ? `https://i.ytimg.com/vi_webp/${yt}/hqdefault.webp` : null);
  const g = gradientFor(video.titleEn);
  const soon = video.source === "NONE" || (video.source === "YOUTUBE" && !yt) || (video.source === "UPLOAD" && !video.media);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-lg border border-line bg-surface text-left transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_18px_50px_-20px_rgba(255,184,0,0.45)]"
    >
      <span className="sr-only">{playLabel.replace(video.titleEn, "").trim()} </span>
      <div className="relative aspect-video overflow-hidden" style={poster ? undefined : { background: g.css }}>
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized={poster.startsWith("https://i.ytimg.com")}
          />
        ) : (
          <span aria-hidden="true" lang="am" className="absolute -right-2 -bottom-6 font-ethiopic text-8xl leading-none! font-black text-white/[0.06]">
            ፈታ
          </span>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-bg/80 via-transparent to-transparent" />
        <span className="absolute top-1/2 left-1/2 flex size-14 -translate-1/2 items-center justify-center rounded-full bg-gold text-bg shadow-[0_0_40px_-6px_rgba(255,184,0,0.7)] transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
        </span>
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Chip size="sm">{typeLabel}</Chip>
          {soon ? <Chip size="sm" variant="muted">{soonLabel}</Chip> : null}
          {video.isSample ? <Chip size="sm" variant="sample">{sampleLabel}</Chip> : null}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-sm leading-snug font-bold text-balance sm:text-base">{video.titleEn}</h3>
        {video.titleAm ? (
          <p lang="am" className="mt-1 text-sm text-muted-foreground">
            {video.titleAm}
          </p>
        ) : null}
      </div>
    </button>
  );
}
