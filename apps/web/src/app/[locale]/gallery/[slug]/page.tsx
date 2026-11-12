import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { MasonryGallery } from "@/components/site/masonry-gallery";
import { PageHeader } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { albumSlugs, getAlbum } from "@/server/queries/gallery";

export async function generateStaticParams() {
  return (await albumSlugs()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/gallery/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const al = await getAlbum(slug);
  return al ? { title: al.titleEn, description: al.descriptionEn ?? undefined, alternates: { canonical: `/gallery/${slug}` } } : {};
}

export default async function AlbumPage({ params }: PageProps<"/[locale]/gallery/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const album = await getAlbum(slug);
  if (!album) notFound();
  const [t, tcs] = await Promise.all([getTranslations("gallery"), getTranslations("comingSoon")]);
  const images = album.items
    .filter((it) => it.media.type === "IMAGE")
    .map((it) => ({
      ...it.media,
      id: it.id,
      caption: it.caption ?? it.media.caption,
      credit: it.media.credit ? t("credit", { credit: it.media.credit }) : null,
    }));

  return (
    <>
      <PageHeader title={album.titleEn} titleAm={album.titleAm ?? undefined} intro={album.descriptionEn ?? undefined}>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <Link href="/gallery" className="inline-flex items-center gap-1.5 py-1 font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("backToGallery")}
          </Link>
          <span className="text-muted-foreground">{t("photos", { count: images.length })}</span>
          {album.episode?.status === "PUBLISHED" ? (
            <Link href={`/episodes/${album.episode.slug}`} className="font-semibold text-gold hover:underline">
              {album.episode.titleEn}
            </Link>
          ) : null}
        </div>
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {images.length ? <MasonryGallery images={images} /> : <ComingSoon variant="panel" title={tcs("photos")} body={tcs("photosBody")} />}
      </div>
    </>
  );
}
