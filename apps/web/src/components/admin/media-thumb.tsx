import { Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PickerMedia } from "@/server/actions/media";

/** Small admin thumbnail (plain <img>: these are already-sized WebP variants). */
export function MediaThumb({ media, className }: { media: Pick<PickerMedia, "url" | "alt" | "type"> | null | undefined; className?: string }) {
  if (!media) return <div className={cn("bg-surface-2", className)} />;
  if (media.type === "VIDEO")
    return (
      <div className={cn("flex items-center justify-center bg-surface-2 text-muted-foreground", className)}>
        <Film className="size-6" aria-hidden="true" />
        <span className="sr-only">{media.alt || "Video"}</span>
      </div>
    );
  const src = media.url.replace(/-1600\.webp$/, "-400.webp");
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={media.alt} loading="lazy" className={cn("bg-surface-2 object-cover", className)} />;
}
