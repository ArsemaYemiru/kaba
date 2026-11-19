"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ArtistCard, type ArtistCardProps } from "@/components/brand/artist-card";
import { Button } from "@/components/ui/button";

/** Featured artists carousel (Embla). Keyboard: arrow buttons are real buttons. */
export function ArtistCarousel({ artists, labels }: { artists: (ArtistCardProps & { id: string })[]; labels: { prev: string; next: string; region: string } }) {
  const [ref, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    if (!api) return;
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on("select", sync).on("reInit", sync);
    const id = window.setTimeout(sync, 0);
    return () => {
      window.clearTimeout(id);
      api.off("select", sync).off("reInit", sync);
    };
  }, [api, sync]);

  return (
    <section aria-roledescription="carousel" aria-label={labels.region} className="relative">
      <div ref={ref} className="-mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
        <ul className="flex touch-pan-y gap-4 sm:gap-5">
          {artists.map((a, i) => (
            <li
              key={a.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${artists.length}`}
              className="w-[58%] shrink-0 sm:w-[38%] md:w-[28%] lg:w-[calc((100%-4*1.25rem)/5)]"
            >
              <ArtistCard {...a} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 38vw, 58vw" />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => api?.scrollPrev()} disabled={!canPrev} aria-label={labels.prev}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" onClick={() => api?.scrollNext()} disabled={!canNext} aria-label={labels.next}>
          <ChevronRight />
        </Button>
      </div>
    </section>
  );
}
