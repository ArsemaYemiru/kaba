import { ArrowLeft, Check, Gavel, Medal } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { TibebStrip } from "@/components/brand/tibeb";
import { TrophyBadge } from "@/components/awards/gold-foil";
import { SampleNotice } from "@/components/awards/sample-notice";
import { NomineeFallback } from "@/components/awards/work-fallback";
import { MediaImage } from "@/components/site/media-image";
import { SectionHeading } from "@/components/site/section-heading";
import { ShareButtons } from "@/components/site/share-buttons";
import { VideoGrid } from "@/components/site/video-grid";
import { VideoPlayer } from "@/components/site/video-player";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isVotable, nomineeNames, nomineesVisible } from "@/lib/phase";
import { cn } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";
import { getNominee } from "@/server/queries/awards";
import { ballotViewer } from "@/server/queries/member";
import { nomineeVideos } from "@/server/queries/videos";
import { MemberBallot } from "@/components/vote/member-ballot";
import { VoteButton } from "@/components/vote/vote-button";

async function load(slug: string) {
  const data = await getNominee(slug);
  // Nominees of an unannounced (DRAFT) edition are not public.
  return data && nomineesVisible(data.edition.phase) ? data : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/nominees/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  const { name } = nomineeNames(data.nominee);
  return {
    title: `${name} · ${data.category.nameEn}`,
    description: data.nominee.blurbEn ?? `${name}, nominated for ${data.category.nameEn} at ${data.edition.nameEn}.`,
    alternates: { canonical: `/nominees/${slug}` },
    ...shareImage(`/og/nominee/${slug}`, `${name} · ${data.category.nameEn}`),
  };
}


export default async function NomineePage({ params }: PageProps<"/[locale]/nominees/[slug]">) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await load(slug);
  if (!data) notFound();
  const { nominee, artists, category, edition } = data;
  const [t, tn, tv, tc, tcs, videos] = await Promise.all([
    getTranslations("nomineePage"),
    getTranslations("nominee"),
    getTranslations("votingType"),
    getTranslations("common"),
    getTranslations("comingSoon"),
    nomineeVideos(nominee.id),
  ]);
  const { name, nameAm, credit } = nomineeNames(nominee);
  const open = edition.phase === "VOTING_OPEN" && isVotable(category.votingType);
  const viewer = await ballotViewer(edition.id);
  const picked = viewer.picks.get(category.id)?.nomineeId === nominee.id;
  const anchor = `/vote#${category.slug}`;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"}/nominees/${slug}`;
  const yt = youtubeId(nominee.youtubeUrl);

  return (
    <article>
      <header className="grain relative overflow-hidden border-b border-line">
        <TibebStrip height={10} />
        <div aria-hidden="true" className="glow-gold absolute top-0 left-1/4 size-[min(800px,130vw)] -translate-x-1/2 -translate-y-1/3" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6">
          <Link href={`/awards/${edition.slug}/${category.slug}`} className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("backToCategory", { category: category.nameEn })}
          </Link>
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end md:gap-12">
            <div
              className={cn(
                "relative mx-auto aspect-[4/5] w-60 overflow-hidden rounded-2xl sm:w-72 md:mx-0 md:w-full",
                nominee.isWinner ? "foil-frame shadow-[0_30px_80px_-30px_rgba(255,184,0,0.6)]" : "border border-line shadow-[0_30px_80px_-30px_rgba(255,184,0,0.35)]",
              )}
            >
              {nominee.image ? <MediaImage media={nominee.image} alt={nominee.image.alt || name} sizes="(min-width: 768px) 320px, 288px" fill priority /> : <NomineeFallback name={name} type={category.nomineeType} />}
              {nominee.isWinner ? <TrophyBadge size="lg" label={tn("winner")} className="absolute top-4 right-4" /> : null}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {nominee.isWinner ? <Chip variant="foil">{tn("winner")}</Chip> : null}
                <Chip>{tv(category.votingType)}</Chip>
                {nominee.isSample ? <Chip variant="sample">{tn("sample")}</Chip> : null}
              </div>
              <p className="mt-4 font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">
                {nominee.isWinner ? t("winnerIn", { category: category.nameEn }) : t("in", { category: category.nameEn })} · {edition.year}
              </p>
              <h1 className="mt-2 font-display text-h1 font-extrabold text-balance break-words">{name}</h1>
              {nameAm ? (
                <p lang="am" className="mt-1 text-2xl font-extrabold text-gold">
                  {nameAm}
                </p>
              ) : null}
              {credit ? <p className="mt-2 text-lg text-muted-foreground">{tn("by", { artist: credit })}</p> : null}
              {artists.length ? (
                <p className="mt-4 text-sm">
                  <span className="text-muted-foreground">{t("artists")}: </span>
                  {artists.map((a, i) => (
                    <span key={a.slug}>
                      {i > 0 ? ", " : ""}
                      <Link href={`/artists/${a.slug}`} className="font-semibold text-gold hover:underline">
                        {a.nameEn}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {open && viewer.eligible ? (
                  <MemberBallot editionId={edition.id} year={edition.year} open>
                    <span className="block w-full max-w-64">
                      <VoteButton categoryId={category.id} nomineeId={nominee.id} name={name} categoryName={category.nameEn} href={`/nominees/${nominee.slug}`} />
                    </span>
                  </MemberBallot>
                ) : open && picked ? (
                  <span className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-gold bg-gold/10 px-6 font-bold text-gold">
                    <Check className="size-5" aria-hidden="true" /> {tn("yourVote")}
                  </span>
                ) : open ? (
                  <Button asChild size="lg" variant={viewer.signedIn && !viewer.eligible ? "outline" : "default"}>
                    <Link href={!viewer.signedIn ? `/sign-in?next=${encodeURIComponent(anchor)}` : !viewer.eligible ? `/verify?next=${encodeURIComponent(anchor)}` : anchor}>
                      {!viewer.signedIn ? tn("signInToVote") : !viewer.eligible ? tn("verifyToVote") : tn("vote")}
                    </Link>
                  </Button>
                ) : !isVotable(category.votingType) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted-foreground">
                    {category.votingType === "HONORARY" ? <Medal className="size-4" aria-hidden="true" /> : <Gavel className="size-4" aria-hidden="true" />} {tv(category.votingType)}
                  </span>
                ) : null}
                <ShareButtons url={url} title={t("shareTitle", { name, category: category.nameEn, year: edition.year })} labels={{ share: tc("share"), copy: tc("copyLink"), copied: tc("copied") }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        {nominee.isSample ? <SampleNotice /> : null}
        {nominee.blurbEn || nominee.blurbAm ? (
          <section aria-labelledby="about-title" className="max-w-3xl">
            <SectionHeading id="about-title" title={t("about")} />
            {nominee.blurbEn ? <p className="text-lg leading-relaxed text-pretty">{nominee.blurbEn}</p> : null}
            {nominee.blurbAm ? (
              <p lang="am" className="mt-4 text-lg">
                {nominee.blurbAm}
              </p>
            ) : null}
          </section>
        ) : null}
        {yt ? (
          <section aria-labelledby="clip-title">
            <h2 id="clip-title" className="sr-only">
              {name}
            </h2>
            <VideoPlayer title={name} src={{ source: "YOUTUBE", youtubeUrl: nominee.youtubeUrl }} comingSoon={{ label: tcs("label"), title: tcs("video"), body: tcs("videoBody") }} />
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
