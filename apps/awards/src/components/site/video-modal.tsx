"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { VideoCardData } from "@/server/queries/videos";
import { VideoPlayer } from "./video-player";

export default function VideoModal({ video, onClose }: { video: VideoCardData; onClose: () => void }) {
  const t = useTranslations();
  const open = video;
  return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[min(64rem,calc(100vw-2rem))] gap-4 border-line bg-surface p-3 sm:max-w-[min(64rem,calc(100vw-2rem))] sm:p-4">
              <VideoPlayer
                title={open.titleEn}
                autoPlay
                src={{
                  source: open.source,
                  youtubeUrl: open.youtubeUrl,
                  fileUrl: open.media?.url,
                  fileMime: open.media?.mimeType,
                  posterUrl: open.poster?.url,
                  captionsUrl: open.captionsUrl,
                }}
                comingSoon={{ label: t("comingSoon.label"), title: t("comingSoon.video"), body: t("comingSoon.videoBody") }}
              />
              <div className="px-1 pb-1">
                <DialogTitle className="font-display text-lg font-bold">{open.titleEn}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {t(`videos.types.${open.type}`)}
                  {open.edition && open.edition.status === "PUBLISHED" ? ` · ${t("videos.fromEdition", { year: open.edition.year })}` : ""}
                </DialogDescription>
              </div>
        </DialogContent>
      </Dialog>
  );
}
