import { connection } from "next/server";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Reveal } from "@/components/brand/reveal";
import { EpisodeCard } from "@/components/site/episode-card";
import { FilterChips, withParams } from "@/components/site/filter-chips";
import { PageHeader } from "@/components/site/section-heading";
import { Pagination } from "@/components/site/pagination";
import { SearchField } from "@/components/site/search-field";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Link } from "@/i18n/navigation";
import { EpisodeFiltersSchema, listEpisodes } from "@/server/queries/episodes";

export const metadata: Metadata = {
  title: "Episodes",
  description: "Every Feta matchup: two stars, one stage, rounds of games all the way to the final.",
  alternates: { canonical: "/episodes" },
};

const TYPES = ["GAME_SHOW", "HOLIDAY_SPECIAL", "PERFORMANCE", "BEHIND_THE_SCENES"] as const;

export default async function EpisodesPage({ params, searchParams }: PageProps<"/[locale]/episodes">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("episodes");
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <Suspense fallback={<GridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[locale]/episodes">["searchParams"] }) {
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const f = EpisodeFiltersSchema.parse({ season: one("season"), type: one("type"), q: one("q"), sort: one("sort"), page: one("page") });
  const [t, te, tc, data] = await Promise.all([
    getTranslations("episodes"),
    getTranslations("episode"),
    getTranslations("common"),
    listEpisodes(f),
  ]);

  const current = {
    season: f.season ? String(f.season) : undefined,
    type: f.type,
    q: f.q || undefined,
    sort: f.sort === "newest" ? undefined : f.sort,
  };
  const href = (patch: Record<string, string | undefined>) => withParams("/episodes", current, { ...patch, page: undefined });
  const filtered = !!(f.season || f.type || f.q);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label={t("type")}
          items={[
            { label: t("allTypes"), href: href({ type: undefined }), active: !f.type },
            ...TYPES.map((ty) => ({ label: te(`types.${ty}`), href: href({ type: ty }), active: f.type === ty })),
          ]}
        />
        <SearchField label={t("search")} placeholder={t("searchPlaceholder")} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {data.seasons.length > 1 ? (
          <FilterChips
            label={t("season")}
            items={[
              { label: t("allSeasons"), href: href({ season: undefined }), active: !f.season },
              ...data.seasons.map((s) => ({ label: tc("season", { season: s }), href: href({ season: String(s) }), active: f.season === s })),
            ]}
          />
        ) : null}
        <FilterChips
          label={t("sort")}
          items={[
            { label: t("newest"), href: href({ sort: undefined }), active: f.sort === "newest" },
            { label: t("oldest"), href: href({ sort: "oldest" }), active: f.sort === "oldest" },
          ]}
        />
        <p className="text-sm text-muted-foreground sm:ml-auto" role="status">
          {tc("results", { count: data.total })}
        </p>
      </div>

      {data.items.length ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((ep, i) => (
            <li key={ep.id}>
              <Reveal index={i}>
                <EpisodeCard episode={ep} priority={i < 3} />
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <ComingSoon
          className="mt-8"
          variant="compact"
          label={t("title")}
          title={t("empty")}
          action={
            filtered ? (
              <Link href="/episodes" className="text-sm font-semibold text-gold hover:underline">
                {tc("clearFilters")}
              </Link>
            ) : undefined
          }
        />
      )}
      <Pagination page={Math.min(f.page, data.pages)} pages={data.pages} hrefFor={(p) => withParams("/episodes", current, { page: p > 1 ? String(p) : undefined })} />
    </>
  );
}

function GridSkeleton() {
  return (
    <ul className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="aspect-video animate-pulse rounded-lg border border-line bg-surface" />
      ))}
    </ul>
  );
}
