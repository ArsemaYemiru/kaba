import { ArrowLeft, Calendar, Hash, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { PortraitFallback } from "@/components/brand/fallback";
import { Reveal } from "@/components/brand/reveal";
import { Scoreboard } from "@/components/brand/scoreboard";
import { TibebStrip } from "@/components/brand/tibeb";
import { VsBadge } from "@/components/brand/vs-badge";
import { EpisodeCard } from "@/components/site/episode-card";
import { MasonryGallery } from "@/components/site/masonry-gallery";
import { MediaImage } from "@/components/site/media-image";
import { SectionHeading } from "@/components/site/section-heading";
import { VideoPlayer } from "@/components/site/video-player";
import { Link } from "@/i18n/navigation";
import { participantHref, participantName, sides } from "@/lib/episode-display";
import { cn } from "@/lib/utils";
import { getEpisode, moreEpisodes } from "@/server/queries/episodes";

export async function generateMetadata({ params }: PageProps<"/[locale]/episodes/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const ep = await getEpisode(slug);
  if (!ep) return {};
  return {
    title: ep.titleEn,
    description: `${ep.titleEn} on Feta (ፈታ), Ethiopia's celebrity game show.`,
    alternates: { canonical: `/episodes/${slug}` },
  };
}

export default async function EpisodePage({ params }: PageProps<"/[locale]/episodes/[slug]">) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const ep = await getEpisode(slug);
  if (!ep) notFound();

  const [t, te, tc, tcs, ts, tg, more, format] = await Promise.all([
    getTranslations("episodes"),
    getTranslations("episode"),
    getTranslations("common"),
    getTranslations("comingSoon"),
    getTranslations("scoreboard"),
    getTranslations("gallery"),
    moreEpisodes(slug, 3),
    getFormatter(),
  ]);

  const { a, b } = sides(ep);
  const aName = a.map(participantName).join(" & ");
  const bName = b.map(participantName).join(" & ");
  const winner = ep.isTie ? null : ep.winnerSide;

  const photos = [
    ...ep.gallery.map((g) => ({ ...g.media, caption: g.media.caption })),
    ...ep.albums.flatMap((al) => al.items.map((it) => ({ ...it.media, caption: it.caption ?? it.media.caption }))),
  ];
  const seen = new Set<string>();
  const gallery = photos
    .filter((p) => p.type === "IMAGE" && !seen.has(p.id) && seen.add(p.id))
    .map((p) => ({ ...p, credit: p.credit ? tg("credit", { credit: p.credit }) : null }));

  return (
    <article>
      <div className="grain relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="glow-gold absolute -top-1/3 left-1/2 size-[min(1000px,150vw)] -translate-x-1/2" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-10">
          <Link href="/episodes" className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("title")}
          </Link>

          <div className="mt-4">
            <VideoPlayer
              title={ep.titleEn}
              src={{
                source: ep.videoSource,
                youtubeUrl: ep.youtubeUrl,
                fileUrl: ep.videoMedia?.url,
                fileMime: ep.videoMedia?.mimeType,
                posterUrl: ep.thumbnail?.url,
              }}
              comingSoon={{ label: tcs("label"), title: tcs("episodeVideo"), body: tcs("episodeVideoBody") }}
            />
          </div>

          <header className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{te(`types.${ep.type}`)}</Chip>
              {ep.season ? <Chip variant="muted">{tc("season", { season: ep.season })}</Chip> : null}
              {ep.episodeNumber ? (
                <Chip variant="muted">
                  <Hash className="size-3" aria-hidden="true" />
                  {tc("episodeNumber", { number: ep.episodeNumber })}
                </Chip>
              ) : null}
              {ep.airDate ? (
                <Chip variant="muted">
                  <Calendar className="size-3" aria-hidden="true" />
                  {tc("aired", { date: format.dateTime(ep.airDate, { dateStyle: "long", timeZone: "Africa/Addis_Ababa" }) })}
                </Chip>
              ) : null}
            </div>
            <h1 className="mt-4 font-display text-h1 font-extrabold text-balance">{ep.titleEn}</h1>
            {ep.titleAm ? (
              <p lang="am" className="mt-2 text-xl font-bold text-gold">
                {ep.titleAm}
              </p>
            ) : null}
          </header>
        </div>
        <TibebStrip height={6} fade className="absolute inset-x-0 bottom-0 opacity-60" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section aria-labelledby="contestants-title">
          <h2 id="contestants-title" className="sr-only">
            {t("contestants")}
          </h2>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <Side list={a} align="left" winner={winner === "A"} winnerLabel={ts("winner")} />
            <VsBadge size="lg" />
            <Side list={b} align="right" winner={winner === "B"} winnerLabel={ts("winner")} />
          </div>
          {ep.isTie ? <p className="mt-4 text-center font-display text-sm font-bold text-gold">{t("tie")}</p> : null}
        </section>

        <Scoreboard
          className="mt-12"
          aName={aName}
          bName={bName}
          winnerSide={winner}
          isTie={ep.isTie}
          rounds={ep.rounds.map((r) => ({ name: r.nameEn, scoreA: r.scoreA, scoreB: r.scoreB }))}
          labels={{ title: ts("title"), round: ts("round"), total: ts("total"), winner: ts("winner"), tie: ts("tie") }}
        />

        {ep.descriptionEn || ep.descriptionAm ? (
          <section aria-labelledby="about-ep" className="mt-12 max-w-3xl">
            <h2 id="about-ep" className="font-display text-h2 font-bold">
              {t("description")}
            </h2>
            {ep.descriptionEn ? (
              <div className="prose-feta mt-4" dangerouslySetInnerHTML={{ __html: ep.descriptionEn }} />
            ) : null}
            {ep.descriptionAm ? (
              <div lang="am" className="prose-feta mt-4" dangerouslySetInnerHTML={{ __html: ep.descriptionAm }} />
            ) : null}
          </section>
        ) : null}

        {ep.videos.length ? (
          <section aria-labelledby="ep-videos" className="mt-12">
            <h2 id="ep-videos" className="font-display text-lg font-bold">
              {t("relatedVideos")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ep.videos.map((v) => (
                <li key={v.slug}>
                  <Link href={`/videos?type=${v.type}`} className="inline-flex rounded-full border border-line px-4 py-2 text-sm hover:border-gold/60">
                    {v.titleEn}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {gallery.length ? (
          <section aria-labelledby="ep-gallery" className="mt-14">
            <SectionHeading id="ep-gallery" title={t("gallery")} />
            <MasonryGallery images={gallery} />
          </section>
        ) : null}
      </div>

      {more.length ? (
        <section aria-labelledby="more-title" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <SectionHeading id="more-title" title={t("moreMatchups")} action={{ href: "/episodes", label: tc("viewAll") }} />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((m, i) => (
              <li key={m.id}>
                <Reveal index={i}>
                  <EpisodeCard episode={m} />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Side({
  list,
  align,
  winner,
  winnerLabel,
}: {
  list: ReturnType<typeof sides>["a"];
  align: "left" | "right";
  winner: boolean;
  winnerLabel: string;
}) {
  return (
    <ul className={cn("flex min-w-0 flex-col gap-4", align === "right" ? "items-end text-right" : "items-start")}>
      {list.map((p, i) => {
        const name = participantName(p);
        const href = participantHref(p);
        const portrait = p.artist?.status === "PUBLISHED" ? p.artist.portrait : null;
        const body = (
          <>
            <span className={cn("relative block size-20 overflow-hidden rounded-full border-2 sm:size-28", winner ? "border-gold" : "border-line")}>
              {portrait ? <MediaImage media={portrait} sizes="112px" fill /> : <PortraitFallback name={name} size="md" />}
            </span>
            <span className="mt-3 block font-display text-base leading-tight font-bold break-words sm:text-xl">{name}</span>
            {p.artist?.nameAm && p.artist.status === "PUBLISHED" ? (
              <span lang="am" className="block text-sm text-muted-foreground">
                {p.artist.nameAm}
              </span>
            ) : null}
            {winner && i === 0 ? (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gold">
                <Trophy className="size-3.5" aria-hidden="true" /> {winnerLabel}
              </span>
            ) : null}
          </>
        );
        return (
          <li key={i} className={cn("flex min-w-0 flex-col", align === "right" ? "items-end" : "items-start")}>
            {href ? (
              <Link href={href} className={cn("group flex flex-col rounded-md hover:[&>span:nth-child(2)]:text-gold", align === "right" ? "items-end" : "items-start")}>
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
