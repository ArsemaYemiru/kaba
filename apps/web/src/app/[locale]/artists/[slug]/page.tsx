import { ArrowLeft, Images, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { ArtistCard } from "@/components/brand/artist-card";
import { Chip } from "@/components/brand/chip";
import { ComingSoon } from "@/components/brand/coming-soon";
import { PortraitFallback } from "@/components/brand/fallback";
import { Reveal } from "@/components/brand/reveal";
import { TibebStrip } from "@/components/brand/tibeb";
import { EpisodeCard } from "@/components/site/episode-card";
import { MasonryGallery } from "@/components/site/masonry-gallery";
import { MediaImage } from "@/components/site/media-image";
import { SectionHeading } from "@/components/site/section-heading";
import { SOCIAL_PLATFORMS, SocialLinksRow, type SocialLinks } from "@/components/site/social-icons";
import { ProfileTabs, type TabDef } from "@/components/site/tabs-nav";
import { VideoGrid } from "@/components/site/video-grid";
import { Link } from "@/i18n/navigation";
import { toArtistCardProps } from "@/lib/artist-display";
import { formatLifespan, formatYearsActive } from "@/lib/years";
import { getArtist, isOnFeta } from "@/server/queries/artists";

const WorksSchema = z.array(z.object({ title: z.string(), year: z.number().int().optional(), type: z.string().optional() })).catch([]);
const SocialSchema = z.array(z.object({ platform: z.string(), url: z.string().url() })).catch([]);

export async function generateMetadata({ params }: PageProps<"/[locale]/artists/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const a = await getArtist(slug);
  if (!a) return {};
  return {
    title: a.seoTitle || (a.nameAm ? `${a.nameEn} (${a.nameAm})` : a.nameEn),
    description: a.seoDescription || a.shortBioEn || undefined,
    alternates: { canonical: `/artists/${slug}` },
  };
}

export default async function ArtistPage({ params }: PageProps<"/[locale]/artists/[slug]">) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const artist = await getArtist(slug);
  if (!artist) notFound();

  const [t, ta, tg] = await Promise.all([getTranslations("artists"), getTranslations("artist"), getTranslations("gallery")]);

  const works = WorksSchema.parse(artist.notableWorks);
  const social: SocialLinks = Object.fromEntries(
    SocialSchema.parse(artist.socialLinks)
      .filter((s) => s.platform in SOCIAL_PLATFORMS)
      .map((s) => [s.platform, s.url]),
  );
  const lifespan = formatLifespan(artist.birthYear, artist.deathYear);
  const active = formatYearsActive(artist.yearsActive);
  const categories = artist.categories.filter((c) => c !== "OTHER");
  const videos = artist.videos.map((v) => ({ ...v.video, id: v.video.slug, captionsUrl: null, episode: null }));
  const gallery = artist.gallery
    .map((g) => g.media)
    .filter((m) => m.type === "IMAGE")
    .map((m) => ({ ...m, credit: m.credit ? tg("credit", { credit: m.credit }) : null }));
  const appearances = artist.appearances.map((a) => a.episode);

  const facts: { label: string; value: string; lang?: string }[] = [];
  if (lifespan) facts.push({ label: t("years"), value: lifespan }); // "b. 1943" or "1940–2009" (spec §4.3)
  if (active) facts.push({ label: t("yearsActive"), value: active });
  if (artist.stageName && artist.stageName !== artist.nameEn) facts.push({ label: t("stageName"), value: artist.stageName });
  if (artist.legalNameEn) facts.push({ label: t("legalName"), value: artist.legalNameEn });
  if (artist.legalNameAm) facts.push({ label: t("legalName"), value: artist.legalNameAm, lang: "am" });
  if (artist.genres.length) facts.push({ label: t("genres"), value: artist.genres.join(", ") });

  const tabs: TabDef[] = [
    {
      id: "bio",
      label: t("tabs.bio"),
      content: (
        <div className="max-w-3xl">
          {artist.bioEn ? (
            <div className="prose-feta" dangerouslySetInnerHTML={{ __html: artist.bioEn }} />
          ) : artist.shortBioEn ? (
            <p className="text-lg leading-relaxed text-pretty">{artist.shortBioEn}</p>
          ) : (
            <p className="text-muted-foreground">{t("bioSoon")}</p>
          )}
          {artist.bioAm ? (
            <div lang="am" className="prose-feta mt-6" dangerouslySetInnerHTML={{ __html: artist.bioAm }} />
          ) : artist.shortBioAm ? (
            <p lang="am" className="mt-6 text-lg">
              {artist.shortBioAm}
            </p>
          ) : null}
        </div>
      ),
    },
  ];
  if (works.length)
    tabs.push({
      id: "works",
      label: t("tabs.works"),
      content: (
        <ol className="max-w-3xl divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {works.map((w, i) => (
            <li key={i} className="flex items-baseline gap-4 px-5 py-4">
              <span className="w-12 shrink-0 font-display text-sm font-bold text-gold tabular-nums">{w.year ?? "—"}</span>
              <span className="min-w-0 flex-1 font-semibold">
                <cite className="not-italic">{w.title}</cite>
              </span>
              {w.type ? <Chip variant="muted" size="sm">{w.type}</Chip> : null}
            </li>
          ))}
        </ol>
      ),
    });
  tabs.push({
    id: "videos",
    label: t("tabs.videos"),
    content: videos.length ? (
      <VideoGrid videos={videos} />
    ) : (
      <ComingSoon variant="compact" icon={PlayCircle} title={t("noVideos")} body={t("noVideosBody")} />
    ),
  });
  tabs.push({
    id: "gallery",
    label: t("tabs.gallery"),
    content: gallery.length ? (
      <MasonryGallery images={gallery} />
    ) : (
      <ComingSoon variant="compact" icon={Images} title={t("noGallery")} body={t("noGalleryBody")} />
    ),
  });
  if (appearances.length)
    tabs.push({
      id: "onfeta",
      label: t("tabs.onFeta"),
      content: (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {appearances.map((ep) => (
            <li key={ep.id}>
              <EpisodeCard episode={ep} />
            </li>
          ))}
        </ul>
      ),
    });

  return (
    <article>
      <header className="grain relative overflow-hidden border-b border-line">
        {artist.cover ? (
          <div aria-hidden="true" className="absolute inset-0 opacity-30">
            <MediaImage media={artist.cover} alt="" sizes="100vw" fill priority />
            <div className="absolute inset-0 bg-linear-to-b from-bg/40 to-bg" />
          </div>
        ) : null}
        <TibebStrip height={10} />
        <div aria-hidden="true" className="glow-gold absolute top-0 left-1/4 size-[min(800px,130vw)] -translate-x-1/2 -translate-y-1/3" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6">
          <Link href="/artists" className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("title")}
          </Link>
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr] md:items-end md:gap-12">
            <div className="relative mx-auto aspect-[3/4] w-56 overflow-hidden rounded-2xl border border-line shadow-[0_30px_80px_-30px_rgba(255,184,0,0.35)] sm:w-64 md:mx-0 md:w-full">
              {artist.portrait ? (
                <MediaImage media={artist.portrait} sizes="(min-width: 768px) 288px, 256px" fill priority />
              ) : (
                <PortraitFallback name={artist.nameEn} size="xl" corner className="pb-[20%]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {artist.isLegend ? <Chip variant="legend">{ta("legend")}</Chip> : null}
                {isOnFeta(artist) ? <Chip variant="red">{ta("onFeta")}</Chip> : null}
                {artist.isGroup ? <Chip variant="muted">{t("group")}</Chip> : null}
                {categories.map((c) => (
                  <Chip key={c}>{ta(`categories.${c}`)}</Chip>
                ))}
              </div>
              <h1 className="mt-4 font-display text-h1 font-extrabold text-balance break-words">{artist.nameEn}</h1>
              {artist.nameAm ? (
                <p lang="am" className="mt-1 text-3xl font-extrabold text-gold">
                  {artist.nameAm}
                </p>
              ) : null}
              {facts.length ? (
                <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2" aria-label={t("quickFacts")}>
                  {facts.map((f, i) => (
                    <div key={i} className="min-w-0">
                      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{f.label}</dt>
                      <dd lang={f.lang} className="mt-0.5 font-semibold">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <SocialLinksRow links={social} className="mt-6" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ProfileTabs tabs={tabs} />
      </div>

      {artist.related.length ? (
        <section aria-labelledby="related-title" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <SectionHeading id="related-title" title={t("related")} />
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
            {artist.related.map((r, i) => (
              <li key={r.id}>
                <Reveal index={i}>
                  <ArtistCard {...toArtistCardProps(r, ta)} sizes="(min-width: 768px) 25vw, 50vw" />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
