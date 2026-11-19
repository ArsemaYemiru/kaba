import Image from "next/image";
import type { MediaLite } from "@/server/queries/media";
import { cn } from "@/lib/utils";

/** next/image for a Media row: alt text, blur placeholder, intrinsic size or fill. */
export function MediaImage({
  media,
  sizes,
  className,
  fill,
  priority,
  alt,
}: {
  media: Pick<MediaLite, "url" | "alt" | "width" | "height" | "blurDataUrl">;
  sizes: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  alt?: string;
}) {
  const altText = alt ?? media.alt;
  const common = {
    src: media.url,
    sizes,
    priority,
    placeholder: media.blurDataUrl ? ("blur" as const) : ("empty" as const),
    blurDataURL: media.blurDataUrl ?? undefined,
  };
  if (fill || !media.width || !media.height) {
    return <Image {...common} alt={altText} fill className={cn("object-cover", className)} />;
  }
  return <Image {...common} alt={altText} width={media.width} height={media.height} className={className} />;
}
