"use client";

import Image from "next/image";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  caption?: string | null;
  /** Already-formatted credit line, e.g. "Photo: …". */
  credit?: string | null;
};

/** Masonry grid + accessible lightbox with captions and photo credits (spec §4.5). */
export function MasonryGallery({
  images,
  className,
  limit,
}: {
  images: GalleryImage[];
  className?: string;
  limit?: number;
}) {
  const tc = useTranslations("common");
  const [index, setIndex] = useState(-1);
  const shown = limit ? images.slice(0, limit) : images;

  return (
    <>
      <ul className={cn("columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4 [&>li]:mb-3 sm:[&>li]:mb-4", className)}>
        {shown.map((img, i) => (
          <li key={img.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full overflow-hidden rounded-lg border border-line bg-surface"
              aria-label={tc("openImage", { alt: img.alt })}
            >
              <Image
                src={img.url}
                alt={img.alt}
                width={img.width ?? 1600}
                height={img.height ?? 1000}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                placeholder={img.blurDataUrl ? "blur" : "empty"}
                blurDataURL={img.blurDataUrl ?? undefined}
                className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-bg/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        plugins={[Captions]}
        captions={{ descriptionTextAlign: "center" }}
        styles={{ container: { backgroundColor: "rgba(10,10,12,0.96)" } }}
        slides={shown.map((img) => ({
          src: img.url,
          alt: img.alt,
          width: img.width ?? undefined,
          height: img.height ?? undefined,
          title: img.caption ?? undefined,
          description: img.credit ?? undefined,
        }))}
      />
    </>
  );
}
