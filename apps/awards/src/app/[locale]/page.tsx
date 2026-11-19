import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, MailCheck, Trophy, UserPlus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Reveal } from "@/components/brand/reveal";
import { SpotlightHero } from "@/components/brand/spotlight-hero";
import { Ticker } from "@/components/brand/ticker";
import { CategoryGrid } from "@/components/awards/category-grid";
import { Countdown } from "@/components/awards/countdown";
import { KeyDates } from "@/components/awards/key-dates";
import { NomineeTile } from "@/components/awards/nominee-tile";
import { SampleNotice } from "@/components/awards/sample-notice";
import { WinnersGrid } from "@/components/awards/winners-grid";
import { MemberBallot } from "@/components/vote/member-ballot";
import { BallotProgress } from "@/components/awards/ballot-progress";
import { ballotViewer } from "@/server/queries/member";
import { getBallot } from "@/server/queries/awards";
import { ArtistCarousel } from "@/components/site/artist-carousel";
import { MasonryGallery } from "@/components/site/masonry-gallery";
import { MediaImage } from "@/components/site/media-image";
import { NewsCard } from "@/components/site/news-card";
import { SectionHeading } from "@/components/site/section-heading";
import { VideoGrid } from "@/components/site/video-grid";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toArtistCardProps } from "@/lib/artist-display";
import { upcomingMilestone } from "@/lib/phase";
import { artistsByIds, legendArtists } from "@/server/queries/artists";
import { featuredNominees, getCurrentEdition, getEdition, getWinners } from "@/server/queries/awards";
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


/** Phase-aware home (spec §4.1). */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, edition] = await Promise.all([getSettings(), getCurrentEdition()]);
  const phase = edition?.phase ?? "DRAFT";
  const [t, th, tp, tcd, ta, tg, tn, tnews, full, winners, featured, featuredArtists, legends, videos, strip, news] = await Promise.all([
    getTranslations("home"),
    getTranslations("hero"),
    getTranslations("phase"),
    getTranslations("countdown"),
    getTranslations("artist"),
    getTranslations("gallery"),
    getTranslations("nominee"),
    getTranslations("news"),
    edition ? getEdition(edition.slug) : null,
    edition && phase === "WINNERS_ANNOUNCED" ? getWinners(edition.slug) : null,
    edition && phase !== "DRAFT" && phase !== "WINNERS_ANNOUNCED" ? featuredNominees(settings.featured.nomineeIds) : [],
    artistsByIds(settings.featured.artistIds),
    legendArtists(),
    highlightVideos(6),
    galleryStrip(8),
    latestNews(3),
  ]);

  const poster = settings.hero.posterId ? settings.media[settings.hero.posterId] : (edition?.heroMedia ?? undefined);
  const heroVideo = settings.hero.videoId ? settings.media[settings.hero.videoId] : undefined;
  const next = edition ? upcomingMilestone(edition) : null;
  const sponsors = settings.sponsors.filter((s) => settings.media[s.logoId]);
  const categories = full?.categories ?? [];
  const artistRail = featuredArtists.length ? featuredArtists : legends;
  // Per-request member state (never cached): progress for members, the voice band for everyone else.
  const votingOpen = phase === "VOTING_OPEN" && !!edition;
  const [viewer, ballot] = votingOpen ? await Promise.all([ballotViewer(edition!.id), getBallot(edition!.id)]) : [null, null];
  const total = ballot?.categories.length ?? 0;
  const done = viewer && ballot ? ballot.categories.filter((c) => viewer.picks.has(c.id)).length : 0;
  const tb = await getTranslations("ballot");

  const actions =
    phase === "VOTING_OPEN" ? (
      <>
        <Button asChild size="lg">
          <Link href="/vote">
            {th("voteNow")} <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/awards/${edition!.slug}`}>{th("seeNominees")}</Link>
        </Button>
      </>
    ) : phase === "WINNERS_ANNOUNCED" ? (
      <Button asChild size="lg">
        <Link href={`/awards/${edition!.slug}/winners`}>
          {th("seeWinners")} <ArrowRight />
        </Link>
      </Button>
    ) : edition && phase !== "DRAFT" ? (
      <Button asChild size="lg">
        <Link href={`/awards/${edition.slug}`}>
          {th("seeNominees")} <ArrowRight />
        </Link>
      </Button>
    ) : null;

  const ticker = [
    ...(edition && phase !== "DRAFT" ? [`${edition.nameEn} · ${tp(phase)}`] : []),
    ...(phase === "VOTING_OPEN" ? [th("voteNow")] : []),
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
        countdown={
          next ? (
            <Countdown
              target={next.target.toISOString()}
              label={tcd(`to.${next.key}`)}
              labels={{ days: tcd("days"), hours: tcd("hours"), minutes: tcd("minutes"), seconds: tcd("seconds"), eat: tcd("eat") }}
            />
          ) : undefined
        }
      />
      <Ticker items={ticker} label={t("heroKicker", { year: edition?.year ?? "" })} />

      {edition?.isSample ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <SampleNotice />
        </div>
      ) : null}

      {viewer?.signedIn && total ? (
        <section aria-labelledby="progress-title" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <h2 id="progress-title" className="sr-only">
            {t("progressTitle")}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <BallotProgress done={done} total={total} label={tb("progress", { done, total })} completeLabel={tb("complete")} className="flex-1" />
            {done < total ? (
              <Button asChild>
                <Link href={viewer.eligible ? "/vote" : "/verify?next=/vote"}>{viewer.eligible ? t("voiceMemberCta") : tb("verifyCta")}</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!edition || phase === "DRAFT" ? (
        <section className={section}>
          <ComingSoon icon={Trophy} label={tp("DRAFT")} title={edition ? t("draftTitle") : t("noEditionTitle")} body={edition ? t("draftBody") : t("noEditionBody")} />
        </section>
      ) : null}

      {winners?.winners.length ? (
        <section aria-labelledby="winners-title" className={section}>
          <SectionHeading id="winners-title" kicker={t("winnersKicker", { year: edition!.year })} title={t("winnersTitle")} action={{ href: `/awards/${edition!.slug}/winners`, label: th("seeWinners") }} />
          <WinnersGrid winners={winners.winners} limit={4} />
        </section>
      ) : null}

      {phase === "VOTING_CLOSED" ? (
        <section className={section}>
          <ComingSoon icon={Trophy} label={tp("VOTING_CLOSED")} title={t("closedTitle")} body={t("closedBody")} />
        </section>
      ) : null}

      {featured.length ? (
        <Hydrate>
        <section aria-labelledby="featured-title" className={section}>
          <SectionHeading id="featured-title" kicker={t("featuredKicker")} title={t("featuredTitle")} />
          <MemberBallot editionId={edition!.id} year={edition!.year} open={phase === "VOTING_OPEN"}>
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {featured.map((n, i) => (
              <li key={n.id}>
                <Reveal index={i} className="h-full">
                  <NomineeTile nominee={n} category={n.category} editionId={n.category.edition.id} phase={n.category.edition.phase} showCategory sizes="(min-width: 1024px) 25vw, 50vw" />
                </Reveal>
              </li>
            ))}
          </ul>
          </MemberBallot>
        </section>
        </Hydrate>
      ) : null}

      {edition && phase !== "DRAFT" && categories.length ? (
        <Hydrate>
        <section aria-labelledby="categories-title" className={section}>
          <SectionHeading id="categories-title" kicker={t("categoriesKicker", { year: edition.year })} title={t("categoriesTitle")} action={{ href: `/awards/${edition.slug}`, label: th("seeNominees") }} />
          <CategoryGrid editionSlug={edition.slug} categories={categories} />
        </section>
        </Hydrate>
      ) : null}

      {phase === "NOMINEES_ANNOUNCED" || phase === "VOTING_OPEN" ? (
        <Hydrate>
        <section aria-labelledby="how-title" className={section}>
          <SectionHeading id="how-title" kicker={t("howKicker")} title={t("howTitle")} action={{ href: "/rules", label: t("rulesLink") }} />
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: UserPlus, title: t("step1Title"), body: t("step1Body") },
              { icon: MailCheck, title: t("step2Title"), body: t("step2Body") },
              { icon: BadgeCheck, title: t("step3Title"), body: t("step3Body") },
            ].map((s, i) => (
              <li key={s.title}>
                <Reveal index={i} className="flex h-full flex-col rounded-lg border border-line bg-surface p-6">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-gold font-display text-sm font-extrabold text-bg">{i + 1}</span>
                    <s.icon className="size-5 text-gold" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>
        </Hydrate>
      ) : null}

      {edition && phase !== "DRAFT" ? (
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
                <NewsCard post={p} sampleLabel={tn("sample")} editionLabel={p.edition?.status === "PUBLISHED" ? tnews("edition", { year: p.edition.year }) : undefined} />
              </li>
            ))}
          </ul>
        </section>
        </Hydrate>
      ) : null}

      {votingOpen && !(viewer?.signedIn && total > 0 && done >= total) ? (
        <Hydrate>
        <section aria-labelledby="voice-title" className={section}>
          <div className="grain relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-6 sm:p-10">
            <div aria-hidden="true" className="glow-gold absolute -right-24 -bottom-24 size-96 opacity-70" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 id="voice-title" className="font-display text-h2 font-bold">
                  {t("voiceTitle")}
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">{viewer?.signedIn ? t("voiceMember") : t("voiceBody")}</p>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link href={viewer?.signedIn ? (viewer.eligible ? "/vote" : "/verify?next=/vote") : "/sign-up?next=/vote"}>
                  {viewer?.signedIn ? t("voiceMemberCta") : t("voiceCta")} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
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
