import { connection } from "next/server";
import { ArrowRight, Gift, Megaphone, Mic2, Ticket } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { Reveal } from "@/components/brand/reveal";
import { SpotlightHero } from "@/components/brand/spotlight-hero";
import { TibebStrip } from "@/components/brand/tibeb";
import { Ticker } from "@/components/brand/ticker";
import { ArtistCarousel } from "@/components/site/artist-carousel";
import { EpisodeCard } from "@/components/site/episode-card";
import { MasonryGallery } from "@/components/site/masonry-gallery";
import { MediaImage } from "@/components/site/media-image";
import { SectionHeading } from "@/components/site/section-heading";
import { VideoGrid } from "@/components/site/video-grid";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toArtistCardProps } from "@/lib/artist-display";
import { participantHref, participantName, sides } from "@/lib/episode-display";
import { artistsByIds } from "@/server/queries/artists";
import { getEpisodeCard, latestEpisodes } from "@/server/queries/episodes";
import { galleryStrip } from "@/server/queries/gallery";
import { getSettings } from "@/server/queries/settings";
import { highlightVideos } from "@/server/queries/videos";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);

  const settings = await getSettings();
  const [t, te, ta, tg, featured, latest, artists, videos, strip] = await Promise.all([
    getTranslations("home"),
    getTranslations("episode"),
    getTranslations("artist"),
    getTranslations("gallery"),
    getEpisodeCard(settings.featured.episodeId),
    latestEpisodes(8),
    artistsByIds(settings.featured.artistIds),
    highlightVideos(6),
    galleryStrip(8),
  ]);
  const th = await getTranslations("hero");

  const poster = settings.hero.posterId ? settings.media[settings.hero.posterId] : undefined;
  const heroVideo = settings.hero.videoId ? settings.media[settings.hero.videoId] : undefined;
  const ctas = settings.hero.ctas.length
    ? settings.hero.ctas
    : [
        { labelEn: th("watchEpisodes"), href: "/episodes" },
        { labelEn: th("beOnTheShow"), href: "/join" },
      ];
  const latestOne = latest[0];
  const sponsors = settings.sponsors.filter((s) => settings.media[s.logoId]);

  return (
    <>
      <SpotlightHero
        taglineEn={settings.hero.taglineEn}
        taglineAm={settings.hero.taglineAm}
        posterUrl={poster?.url}
        posterBlur={poster?.blurDataUrl}
        videoUrl={heroVideo?.url}
        actions={ctas.map((c, i) => (
          <Button key={c.href + i} asChild size="lg" variant={i === 0 ? "default" : "outline"}>
            <Link href={c.href}>
              {c.labelEn} {i === 0 ? <ArrowRight /> : null}
            </Link>
          </Button>
        ))}
        asideLabel={latestOne ? th("latestMatchup") : undefined}
        aside={latestOne ? <EpisodeCard episode={latestOne} size="mini" /> : undefined}
      />
      <Ticker items={settings.ticker} />

      {featured ? (
        <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
          <SectionHeading id="featured-title" kicker={t("featuredKicker")} title={t("featuredMatchup")} />
          <div className="grid items-center gap-8 lg:grid-cols-[1.6fr_1fr]">
            <Reveal>
              <EpisodeCard episode={featured} size="lg" />
            </Reveal>
            <Reveal index={1} className="rounded-lg border border-line bg-surface p-6 sm:p-8">
              <Chip>{te(`types.${featured.type}`)}</Chip>
              <h3 className="mt-4 font-display text-2xl leading-tight font-bold text-balance">{featured.titleEn}</h3>
              {featured.titleAm ? (
                <p lang="am" className="mt-1 text-lg font-semibold text-gold">
                  {featured.titleAm}
                </p>
              ) : null}
              <dl className="mt-6 grid grid-cols-2 gap-4">
                {(["A", "B"] as const).map((side) => {
                  const list = sides(featured)[side === "A" ? "a" : "b"];
                  return (
                    <div key={side} className="rounded-md border border-line bg-bg/50 p-3">
                      <dt className="font-display text-[0.625rem] font-bold tracking-[0.3em] text-muted-foreground uppercase">{te("side", { side })}</dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {list.map((p, i) => {
                          const href = participantHref(p);
                          return (
                            <span key={i}>
                              {i > 0 ? " & " : ""}
                              {href ? (
                                <Link href={href} className="text-gold hover:underline">
                                  {participantName(p)}
                                </Link>
                              ) : (
                                participantName(p)
                              )}
                            </span>
                          );
                        })}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <Button asChild className="mt-6 w-full sm:w-auto">
                <Link href={`/episodes/${featured.slug}`}>
                  {th("watchEpisodes")} <ArrowRight />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>
      ) : null}

      {latest.length ? (
        <section aria-labelledby="latest-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
          <SectionHeading id="latest-title" title={t("latestEpisodes")} action={{ href: "/episodes", label: t("allEpisodes") }} />
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-5 sm:px-6">
            {latest.map((ep, i) => (
              <li key={ep.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
                <Reveal index={i}>
                  <EpisodeCard episode={ep} />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {artists.length ? (
        <section aria-labelledby="artists-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
          <SectionHeading
            id="artists-title"
            kicker={t("artistsKicker")}
            title={t("artistsSpotlight")}
            action={{ href: "/artists", label: t("exploreArtists") }}
          />
          <ArtistCarousel
            artists={artists.map((a) => toArtistCardProps(a, ta))}
            labels={{ prev: t("prev"), next: t("next"), region: t("artistsSpotlight") }}
          />
        </section>
      ) : null}

      {videos.length ? (
        <section aria-labelledby="videos-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
          <SectionHeading id="videos-title" title={t("highlights")} action={{ href: "/videos", label: t("allVideos") }} />
          <VideoGrid videos={videos} layout="row" />
        </section>
      ) : null}

      <section aria-labelledby="holiday-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-2xl border border-line bg-surface">
            <TibebStrip height={10} />
            <div aria-hidden="true" className="glow-red absolute -right-24 -bottom-24 size-96 opacity-70" />
            <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-5">
                <span className="hidden size-14 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-bg/60 text-gold sm:flex">
                  <Gift className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="holiday-title" className="font-display text-h2 font-bold">
                    {t("holidayTitle")}
                  </h2>
                  <p className="mt-2 max-w-xl text-muted-foreground">{t("holidayBody")}</p>
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link href="/episodes?type=HOLIDAY_SPECIAL">
                  {t("holidayCta")} <ArrowRight />
                </Link>
              </Button>
            </div>
            <TibebStrip height={10} />
          </div>
        </Reveal>
      </section>

      {strip.length ? (
        <section aria-labelledby="gallery-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
          <SectionHeading id="gallery-title" title={t("galleryTitle")} action={{ href: "/gallery", label: t("openGallery") }} />
          <MasonryGallery
            images={strip.map((s) => ({
              ...s.media,
              id: s.id,
              caption: s.caption ?? s.media.caption,
              credit: s.media.credit ? tg("credit", { credit: s.media.credit }) : null,
            }))}
          />
        </section>
      ) : null}

      <section aria-labelledby="join-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
        <SectionHeading id="join-title" kicker={t("joinKicker")} title={t("joinTitle")} />
        <p className="-mt-3 mb-8 max-w-2xl text-muted-foreground">{t("joinBody")}</p>
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            { tab: "contestant", icon: Mic2, title: t("joinContestant"), body: t("joinContestantBody") },
            { tab: "audience", icon: Ticket, title: t("joinAudience"), body: t("joinAudienceBody") },
            { tab: "sponsor", icon: Megaphone, title: t("joinSponsor"), body: t("joinSponsorBody") },
          ].map((c, i) => (
            <li key={c.tab}>
              <Reveal index={i}>
                <Link
                  href={`/join?tab=${c.tab}`}
                  className="group flex h-full flex-col rounded-lg border border-line bg-surface p-6 transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-gold/60"
                >
                  <c.icon className="size-6 text-gold" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                  <ArrowRight className="mt-6 size-5 text-gold transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {sponsors.length ? (
        <section aria-labelledby="sponsors-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
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
      ) : null}
    </>
  );
}
