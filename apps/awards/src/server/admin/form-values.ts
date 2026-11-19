import "server-only";
import { dateToAddisLocal } from "@/schemas/admin/common";
import type { getAlbumForEdit, getArtistForEdit, getNewsForEdit, getVideoForEdit } from "./loaders";

/** DB rows → form values (nulls become "", numbers become strings). */
const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

type Artist = NonNullable<Awaited<ReturnType<typeof getArtistForEdit>>>;
export function artistToForm(a: Artist | null) {
  const works = (Array.isArray(a?.notableWorks) ? a!.notableWorks : []) as { title?: string; year?: number; type?: string }[];
  const social = (Array.isArray(a?.socialLinks) ? a!.socialLinks : []) as { platform?: string; url?: string }[];
  return {
    nameEn: s(a?.nameEn),
    nameAm: s(a?.nameAm),
    slug: s(a?.slug),
    stageName: s(a?.stageName),
    legalNameEn: s(a?.legalNameEn),
    legalNameAm: s(a?.legalNameAm),
    isGroup: a?.isGroup ?? false,
    categories: a?.categories ?? [],
    shortBioEn: s(a?.shortBioEn),
    shortBioAm: s(a?.shortBioAm),
    bioEn: s(a?.bioEn),
    bioAm: s(a?.bioAm),
    birthYear: s(a?.birthYear),
    deathYear: s(a?.deathYear),
    yearsActive: s(a?.yearsActive),
    genres: a?.genres ?? [],
    notableWorks: works.map((w) => ({ title: s(w.title), year: s(w.year), type: s(w.type) })),
    socialLinks: social.map((l) => ({ platform: s(l.platform) || "website", url: s(l.url) })),
    portraitId: a?.portraitId ?? null,
    coverId: a?.coverId ?? null,
    galleryIds: a?.gallery.map((g) => g.mediaId) ?? [],
    videoIds: a?.videos.map((v) => v.videoId) ?? [],
    isLegend: a?.isLegend ?? false,
    featured: a?.featured ?? false,
    status: a?.status ?? ("DRAFT" as const),
    sortOrder: s(a?.sortOrder ?? 0),
    seoTitle: s(a?.seoTitle),
    seoDescription: s(a?.seoDescription),
  };
}

type Video = NonNullable<Awaited<ReturnType<typeof getVideoForEdit>>>;
export function videoToForm(v: Video | null) {
  return {
    titleEn: s(v?.titleEn),
    titleAm: s(v?.titleAm),
    slug: s(v?.slug),
    type: v?.type ?? ("PERFORMANCE" as const),
    source: v?.source ?? ("NONE" as const),
    youtubeUrl: s(v?.youtubeUrl),
    mediaId: v?.mediaId ?? null,
    captionsUrl: s(v?.captionsUrl),
    posterId: v?.posterId ?? null,
    editionId: v?.editionId ?? "",
    artistIds: v?.artists.map((a) => a.artistId) ?? [],
    nomineeIds: v?.nominees.map((n) => n.nomineeId) ?? [],
    featured: v?.featured ?? false,
    status: v?.status ?? ("DRAFT" as const),
    publishedAt: dateToAddisLocal(v?.publishedAt),
  };
}

type Album = NonNullable<Awaited<ReturnType<typeof getAlbumForEdit>>>;
export function albumToForm(a: Album | null) {
  return {
    titleEn: s(a?.titleEn),
    titleAm: s(a?.titleAm),
    slug: s(a?.slug),
    descriptionEn: s(a?.descriptionEn),
    descriptionAm: s(a?.descriptionAm),
    coverId: a?.coverId ?? null,
    editionId: a?.editionId ?? "",
    items: a?.items.map((i) => ({ mediaId: i.mediaId, caption: s(i.caption) })) ?? [],
    status: a?.status ?? ("DRAFT" as const),
  };
}

type News = NonNullable<Awaited<ReturnType<typeof getNewsForEdit>>>;
export function newsToForm(n: News | null) {
  return {
    titleEn: s(n?.titleEn),
    titleAm: s(n?.titleAm),
    slug: s(n?.slug),
    excerptEn: s(n?.excerptEn),
    excerptAm: s(n?.excerptAm),
    bodyEn: s(n?.bodyEn),
    bodyAm: s(n?.bodyAm),
    coverId: n?.coverId ?? null,
    tags: n?.tags ?? [],
    editionId: n?.editionId ?? "",
    featured: n?.featured ?? false,
    status: n?.status ?? ("DRAFT" as const),
    publishedAt: dateToAddisLocal(n?.publishedAt),
  };
}
