import { connection } from "next/server";
import { Crown, Tv } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ArtistCard } from "@/components/brand/artist-card";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Reveal } from "@/components/brand/reveal";
import { ArtistCarousel } from "@/components/site/artist-carousel";
import { FilterChips, withParams } from "@/components/site/filter-chips";
import { PageHeader, SectionHeading } from "@/components/site/section-heading";
import { SearchField } from "@/components/site/search-field";
import { Link } from "@/i18n/navigation";
import { toArtistCardProps } from "@/lib/artist-display";
import { cn } from "@/lib/utils";
import { ArtistFiltersSchema, CATEGORIES, legendArtists, listArtists } from "@/server/queries/artists";

export const metadata: Metadata = {
  title: "Ethiopian artists",
  description: "The faces and voices of Ethiopian music, comedy, film and media, from the legends of the golden age to today's stars.",
  alternates: { canonical: "/artists" },
};

export default async function ArtistsPage({ params, searchParams }: PageProps<"/[locale]/artists">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, ta, home, legends] = await Promise.all([
    getTranslations("artists"),
    getTranslations("artist"),
    getTranslations("home"),
    legendArtists(),
  ]);
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      {legends.length ? (
        <section aria-labelledby="legends-title" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <SectionHeading id="legends-title" kicker={ta("legend")} title={t("legendsRail")} />
          <ArtistCarousel
            artists={legends.map((a) => toArtistCardProps(a, ta))}
            labels={{ prev: home("prev"), next: home("next"), region: t("legendsRail") }}
          />
        </section>
      ) : null}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Suspense fallback={<GridSkeleton />}>
          <Directory searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Directory({ searchParams }: { searchParams: PageProps<"/[locale]/artists">["searchParams"] }) {
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const f = ArtistFiltersSchema.parse({ q: one("q"), category: one("category"), legends: one("legends"), onFeta: one("onFeta"), sort: one("sort") });
  const [t, ta, tc, artists] = await Promise.all([
    getTranslations("artists"),
    getTranslations("artist"),
    getTranslations("common"),
    listArtists(f),
  ]);
  const current = { q: f.q || undefined, category: f.category, legends: f.legends, onFeta: f.onFeta, sort: f.sort === "featured" ? undefined : f.sort };
  const href = (patch: Record<string, string | undefined>) => withParams("/artists", current, patch);
  const toggle = "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors";
  const filtered = !!(f.q || f.category || f.legends || f.onFeta);

  return (
    <>
      <h2 className="sr-only">{t("filters")}</h2>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label={t("filters")}
          items={[
            { label: t("allCategories"), href: href({ category: undefined }), active: !f.category },
            ...CATEGORIES.map((c) => ({ label: ta(`categories.${c}`), href: href({ category: c }), active: f.category === c })),
          ]}
        />
        <SearchField label={t("search")} placeholder={t("searchPlaceholder")} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href({ legends: f.legends ? undefined : "1" })}
          scroll={false}
          aria-pressed={!!f.legends}
          className={cn(toggle, f.legends ? "border-gold text-gold" : "border-line text-muted-foreground hover:text-foreground")}
        >
          <Crown className="size-4" aria-hidden="true" /> {t("legendsOnly")}
        </Link>
        <Link
          href={href({ onFeta: f.onFeta ? undefined : "1" })}
          scroll={false}
          aria-pressed={!!f.onFeta}
          className={cn(toggle, f.onFeta ? "border-red text-red" : "border-line text-muted-foreground hover:text-foreground")}
        >
          <Tv className="size-4" aria-hidden="true" /> {t("onFetaOnly")}
        </Link>
        <span className="mx-2 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
        <FilterChips
          label={t("sort")}
          items={[
            { label: t("sortFeatured"), href: href({ sort: undefined }), active: f.sort === "featured" },
            { label: t("sortAz"), href: href({ sort: "az" }), active: f.sort === "az" },
            { label: t("sortZa"), href: href({ sort: "za" }), active: f.sort === "za" },
          ]}
        />
        <p className="text-sm text-muted-foreground sm:ml-auto" role="status">
          {tc("results", { count: artists.length })}
        </p>
      </div>
      {artists.length ? (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {artists.map((a, i) => (
            <li key={a.id}>
              <Reveal index={i}>
                <ArtistCard {...toArtistCardProps(a, ta)} />
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <ComingSoon
          className="mt-8"
          variant="compact"
          label={t("title")}
          title={f.onFeta && !f.q && !f.category && !f.legends ? t("emptyOnFeta") : t("empty")}
          action={
            filtered ? (
              <Link href="/artists" className="text-sm font-semibold text-gold hover:underline">
                {tc("clearFilters")}
              </Link>
            ) : undefined
          }
        />
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <ul className="mt-20 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <li key={i} className="aspect-[3/4] animate-pulse rounded-lg border border-line bg-surface" />
      ))}
    </ul>
  );
}
