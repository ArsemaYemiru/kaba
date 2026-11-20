import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Reveal } from "@/components/brand/reveal";
import { SpotlightHero } from "@/components/brand/spotlight-hero";
import { Ticker } from "@/components/brand/ticker";
import { CategoryGrid } from "@/components/awards/category-grid";
import { HonoreeCard } from "@/components/awards/honoree-card";
import { KeyDates } from "@/components/awards/key-dates";
import { SampleNotice } from "@/components/awards/sample-notice";
import { ArtistCarousel } from "@/components/site/artist-carousel";
import { MasonryGallery } from "@/components/site/masonry-gallery";
import { MediaImage } from "@/components/site/media-image";
import { NewsCard } from "@/components/site/news-card";
import { SectionHeading } from "@/components/site/section-heading";
import { VideoGrid } from "@/components/site/video-grid";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toArtistCardProps } from "@/lib/artist-display";
import { artistsByIds, legendArtists } from "@/server/queries/artists";
import { featuredHonorees, getCurrentEdition, getEdition } from "@/server/queries/awards";
import { galleryStrip } from "@/server/queries/gallery";
import { latestNews } from "@/server/queries/news";
import { getSettings } from "@/server/queries/settings";
import { highlightVideos } from "@/server/queries/videos";
import { JsonLd } from "@/components/site/json-ld";
import { eventLd, organizationLd } from "@/lib/structured-data";

const section = "cv-auto mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24";

/**
 * Each section hydrates as its own task (React selective hydration), so one long
 * hydration task becomes many short ones (TBT, A-70). Content is already in the HTML.
 */
const Hydrate = ({ children }: { children: React.ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

/** Home (A-76): the current edition's genres and honored artists, then artists, videos, gallery and news. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, edition] = await Promise.all([getSettings(), getCurrentEdition()]);
  const [t, th, ta, tg, tho, tnews, full, featured, featuredArtists, legends, videos, strip, news] = await Promise.all([
    getTranslations("home"),
    getTranslations("hero"),
    getTranslations("artist"),
    getTranslations("gallery"),
    getTranslations("honoree"),
    getTranslations("news"),
    edition ? getEdition(edition.slug) : null,
    edition ? featuredHonorees(settings.featured.nomineeIds) : [],
    artistsByIds(settings.featured.artistIds),
    legendArtists(),
    highlightVideos(6),
    galleryStrip(8),
    latestNews(3),
  ]);

  const poster = settings.hero.posterId ? settings.media[settings.hero.posterId] : (edition?.heroMedia ?? undefined);
  const heroVideo = settings.hero.videoId ? settings.media[settings.hero.videoId] : undefined;
  const sponsors = settings.sponsors.filter((s) => settings.media[s.logoId]);
  const categories = full?.categories ?? [];
  const honorees = full?.honorees ?? 0;
  const artistRail = featuredArtists.length ? featuredArtists : legends;
  const am = locale === "am";

  const actions = edition ? (
    <>
      <Button asChild size="lg">
        <Link href={`/awards/${edition.slug}`}>
          {th("seeHonorees")} <ArrowRight />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/artists">{th("browseArtists")}</Link>
      </Button>
    </>
  ) : (
    <Button asChild size="lg">
      <Link href="/artists">
        {th("browseArtists")} <ArrowRight />
      </Link>
    </Button>
  );

  const ticker = [
    ...(edition ? [`${(am && edition.nameAm) || edition.nameEn} · ${t("honoringCount", { count: honorees })}`] : []),
    ...settings.ticker,
  ];

  return (
    <>
      <JsonLd data={organizationLd({ logoUrl: settings.branding.logoId ? settings.media[settings.branding.logoId]?.url : null, sameAs: Object.values(settings.social).filter((v): v is string => !!v), email: settings.contact.email })} />
      {edition && eventLd(edition) ? <JsonLd data={eventLd(edition)} /> : null}
      <SpotlightHero
        taglineEn={settings.hero.taglineEn}
        taglineAm={settings.hero.taglineAm}
        year={edition?.year}
        posterUrl={poster?.url}
        posterBlur={poster?.blurDataUrl}
        videoUrl={heroVideo?.url}
        actions={actions}
      />
      {ticker.length ? <Ticker items={ticker} label={t("heroKicker", { year: edition?.year ?? "" })} /> : null}

      {edition?.isSample ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <SampleNotice />
        </div>
      ) : null}

      {!edition ? (
        <section className={section}>
          <ComingSoon icon={Trophy} label={t("comingSoon")} title={t("noEditionTitle")} body={t("noEditionBody")} />
        </section>
      ) : null}

      {featured.length ? (
        <Hydrate>
          <section aria-labelledby="featured-title" className={section}>
            <SectionHeading id="featured-title" kicker={t("featuredKicker", { year: edition!.year })} title={t("featuredTitle")} />
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {featured.map((h, i) => (
                <li key={h.id}>
                  <Reveal index={i} className="h-full">
                    <HonoreeCard honoree={h} genre={(am && h.category.nameAm) || h.category.nameEn} sizes="(min-width: 1024px) 25vw, 50vw" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        </Hydrate>
      ) : null}

      {edition && categories.length ? (
        <Hydrate>
          <section aria-labelledby="categories-title" className={section}>
            <SectionHeading id="categories-title" kicker={t("categoriesKicker", { year: edition.year })} title={t("categoriesTitle")} action={{ href: `/awards/${edition.slug}`, label: th("seeHonorees") }} />
            <CategoryGrid editionSlug={edition.slug} categories={categories} />
          </section>
        </Hydrate>
      ) : edition ? (
        <section className={section}>
          <ComingSoon icon={Trophy} label={t("comingSoon")} title={t("genresSoonTitle")} body={t("genresSoonBody")} />
        </section>
      ) : null}

      {edition?.ceremonyAt ? (
        <Hydrate>
          <section aria-labelledby="dates-title" className={section}>
            <SectionHeading id="dates-title" title={t("datesTitle")} />
            <KeyDates edition={edition} />
          </section>
        </Hydrate>
      ) : null}

      {artistRail.length ? (
        <Hydrate>
        <section aria-labelledby="legends-title" className={section}>
          <SectionHeading id="legends-title" kicker={featuredArtists.length ? t("artistsKicker") : t("legendsKicker")} title={featuredArtists.length ? t("artistsTitle") : t("legendsTitle")} action={{ href: "/artists", label: t("allArtists") }} />
          <ArtistCarousel artists={artistRail.map((a) => toArtistCardProps(a, ta))} labels={{ prev: t("prev"), next: t("next"), region: featuredArtists.length ? t("artistsTitle") : t("legendsTitle") }} />
        </section>
        </Hydrate>
      ) : null}

      {videos.length ? (
        <Hydrate>
        <section aria-labelledby="videos-title" className={section}>
          <SectionHeading id="videos-title" title={t("videosTitle")} action={{ href: "/videos", label: t("allVideos") }} />
          <VideoGrid videos={videos} layout="row" />
        </section>
        </Hydrate>
      ) : null}

      {strip.length ? (
        <Hydrate>
        <section aria-labelledby="gallery-title" className={section}>
          <SectionHeading id="gallery-title" title={t("galleryTitle")} action={{ href: "/gallery", label: t("openGallery") }} />
          <MasonryGallery images={strip.map((s) => ({ ...s.media, id: s.id, caption: s.caption ?? s.media.caption, credit: s.media.credit ? tg("credit", { credit: s.media.credit }) : null }))} />
        </section>
        </Hydrate>
      ) : null}

      {news.length ? (
        <Hydrate>
        <section aria-labelledby="news-title" className={section}>
          <SectionHeading id="news-title" title={t("newsTitle")} action={{ href: "/news", label: t("allNews") }} />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((p) => (
              <li key={p.slug}>
                <NewsCard post={p} sampleLabel={tho("sample")} editionLabel={p.edition?.status === "PUBLISHED" ? tnews("edition", { year: p.edition.year }) : undefined} />
              </li>
            ))}
          </ul>
        </section>
        </Hydrate>
      ) : null}

      {sponsors.length ? (
        <Hydrate>
        <section aria-labelledby="sponsors-title" className={section}>
          <h2 id="sponsors-title" className="text-center font-display text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
            {t("sponsors")}
          </h2>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {sponsors.map((s) => {
              const logo = settings.media[s.logoId]!;
              const img = (
                <span className="relative block h-12 w-32 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
                  <MediaImage media={logo} alt={s.name} sizes="128px" fill className="object-contain" />
                </span>
              );
              return <li key={s.logoId}>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{img}</a> : img}</li>;
            })}
          </ul>
        </section>
        </Hydrate>
      ) : null}
    </>
  );
}
