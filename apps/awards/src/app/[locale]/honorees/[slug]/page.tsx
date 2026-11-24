import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { TibebStrip } from "@/components/brand/tibeb";
import { NomineeFallback } from "@/components/awards/work-fallback";
import { MediaImage } from "@/components/site/media-image";
import { SectionHeading } from "@/components/site/section-heading";
import { ShareButtons } from "@/components/site/share-buttons";
import { VideoGrid } from "@/components/site/video-grid";
import { VideoPlayer } from "@/components/site/video-player";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { youtubeId } from "@/lib/youtube";
import { getHonoree } from "@/server/queries/awards";
import { honoreeVideos } from "@/server/queries/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/honorees/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const data = await getHonoree(slug);
  if (!data) return {};
  const name = data.honoree.displayNameEn;
  return {
    title: `${name} · ${data.category.nameEn} · ${data.edition.year}`,
    description: data.honoree.blurbEn ?? `${name}, honored in ${data.category.nameEn} at ${data.edition.nameEn}.`,
    alternates: { canonical: `/honorees/${slug}` },
    ...shareImage(`/og/honoree/${slug}`, `${name} · ${data.category.nameEn}`),
  };
}

/** One recognition: the artist, the genre, the citation and the featured work (A-76). */
export default async function HonoreePage({ params }: PageProps<"/[locale]/honorees/[slug]">) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getHonoree(slug);
  if (!data) notFound();
  const { honoree, category, edition } = data;
  const [t, th, tc, tcs, videos] = await Promise.all([
    getTranslations("honoreePage"),
    getTranslations("honoree"),
    getTranslations("common"),
    getTranslations("comingSoon"),
    honoreeVideos(honoree.id),
  ]);
  const am = locale === "am";
  const name = (am && honoree.displayNameAm) || honoree.displayNameEn;
  const subName = am ? (honoree.displayNameAm ? honoree.displayNameEn : null) : honoree.displayNameAm;
  const genre = (am && category.nameAm) || category.nameEn;
  const work = (am && honoree.workTitleAm) || honoree.workTitleEn;
  const img = honoree.image ?? honoree.artist.portrait;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"}/honorees/${slug}`;
  const yt = youtubeId(honoree.youtubeUrl);

  return (
    <article>
      <header className="grain relative overflow-hidden border-b border-line">
        <TibebStrip height={10} />
        <div aria-hidden="true" className="glow-gold absolute top-0 left-1/4 size-[min(800px,130vw)] -translate-x-1/2 -translate-y-1/3" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6">
          <Link href={`/awards/${edition.slug}/${category.slug}`} className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("backToCategory", { category: genre })}
          </Link>
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end md:gap-12">
            <div className="relative mx-auto aspect-[4/5] w-60 overflow-hidden rounded-2xl border border-line shadow-[0_30px_80px_-30px_rgba(255,184,0,0.35)] sm:w-72 md:mx-0 md:w-full">
              {img ? <MediaImage media={img} alt={img.alt || name} sizes="(min-width: 768px) 320px, 288px" fill priority /> : <NomineeFallback name={name} type={honoree.artist.isGroup ? "GROUP" : "PERSON"} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {honoree.artist.isLegend ? <Chip variant="legend">{th("legend")}</Chip> : null}
              </div>
              <p className="mt-4 font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{th("recognizedIn", { genre, year: edition.year })}</p>
              <h1 className="mt-2 font-display text-h1 font-extrabold text-balance break-words">{name}</h1>
              {subName ? (
                <p lang={am ? "en" : "am"} className="mt-1 text-2xl font-extrabold text-gold">
                  {subName}
                </p>
              ) : null}
              {work ? <p className="mt-2 text-lg text-muted-foreground">{th("featuredWork", { work })}</p> : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild variant="outline">
                  <Link href={`/artists/${honoree.artist.slug}`}>{t("artistProfile")}</Link>
                </Button>
                <ShareButtons url={url} title={t("shareTitle", { name, category: genre, year: edition.year })} labels={{ share: tc("share"), copy: tc("copyLink"), copied: tc("copied") }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        {honoree.blurbEn || honoree.blurbAm ? (
          <section aria-labelledby="citation-title" className="max-w-3xl">
            <SectionHeading id="citation-title" title={t("citation")} />
            {(am ? honoree.blurbAm : honoree.blurbEn) ? (
              <p lang={am ? "am" : undefined} className="text-lg leading-relaxed text-pretty">
                {am ? honoree.blurbAm : honoree.blurbEn}
              </p>
            ) : null}
            {(am ? honoree.blurbEn : honoree.blurbAm) ? (
              <p lang={am ? "en" : "am"} className="mt-4 text-lg text-muted-foreground">
                {am ? honoree.blurbEn : honoree.blurbAm}
              </p>
            ) : null}
          </section>
        ) : null}
        {yt ? (
          <section aria-labelledby="clip-title">
            <h2 id="clip-title" className="sr-only">
              {work ?? name}
            </h2>
            <VideoPlayer title={work ?? name} src={{ source: "YOUTUBE", youtubeUrl: honoree.youtubeUrl }} comingSoon={{ label: tcs("label"), title: tcs("video"), body: tcs("videoBody") }} />
          </section>
        ) : null}
        {videos.length ? (
          <section aria-labelledby="videos-title">
            <SectionHeading id="videos-title" title={t("videos")} />
            <VideoGrid videos={videos} />
          </section>
        ) : null}
      </div>
    </article>
  );
}
