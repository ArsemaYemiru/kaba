import type { ArtistCardProps } from "@/components/brand/artist-card";
import { isOnFeta, type ArtistCardData } from "@/server/queries/artists";

type T = (key: string) => string;

/** Maps an artist row to ArtistCard props (category labels via the artist.* messages). */
export function toArtistCardProps(a: ArtistCardData, t: T): ArtistCardProps & { id: string } {
  return {
    id: a.id,
    nameEn: a.nameEn,
    nameAm: a.nameAm,
    categories: a.categories.filter((c) => c !== "OTHER").map((c) => t(`categories.${c}`)),
    imageUrl: a.portrait?.url,
    imageAlt: a.portrait?.alt,
    blurDataUrl: a.portrait?.blurDataUrl,
    isLegend: a.isLegend,
    onFeta: isOnFeta(a),
    legendLabel: t("legend"),
    onFetaLabel: t("onFeta"),
    href: `/artists/${a.slug}`,
  };
}
