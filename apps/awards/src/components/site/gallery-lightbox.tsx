"use client";

import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";

export type Slide = { src: string; alt: string; width?: number; height?: number; title?: string; description?: string };

/** Loaded only when a photo is opened (keeps the lightbox out of the initial bundle). */
export default function GalleryLightbox({ slides, index, onClose }: { slides: Slide[]; index: number; onClose: () => void }) {
  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      plugins={[Captions]}
      captions={{ descriptionTextAlign: "center" }}
      styles={{ container: { backgroundColor: "rgba(10,10,12,0.96)" } }}
      slides={slides}
    />
  );
}
