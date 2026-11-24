import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { CategoryGrid } from "@/components/awards/category-grid";
import { KeyDates } from "@/components/awards/key-dates";
import { PageHeader, SectionHeading } from "@/components/site/section-heading";
import { getEdition } from "@/server/queries/awards";
import { JsonLd } from "@/components/site/json-ld";
import { eventLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/awards/[year]">): Promise<Metadata> {
  await connection();
  const { year } = await params;
  const data = await getEdition(year);
  if (!data) return {};
  return {
    title: data.edition.nameEn,
    description: `The genres and artists honored at ${data.edition.nameEn}.`,
    alternates: { canonical: `/awards/${year}` },
    ...shareImage(`/og/edition/${year}`, data.edition.nameEn),
  };
}

/** An edition: its genre categories and how many artists each honors. */
export default async function EditionPage({ params }: PageProps<"/[locale]/awards/[year]">) {
  await connection();
  const { locale, year } = await params;
  setRequestLocale(locale);
  const data = await getEdition(year);
  if (!data) notFound();
  const { edition, categories, honorees } = data;
  const t = await getTranslations("awards");
  const am = locale === "am";

  return (
    <>
      {eventLd(edition) ? <JsonLd data={eventLd(edition)} /> : null}
      <PageHeader kicker={t("title")} title={(am && edition.nameAm) || edition.nameEn} titleAm={am ? undefined : (edition.nameAm ?? undefined)}>
        <p className="mt-5 text-sm text-muted-foreground">
          {t("genreCount", { count: categories.length })} · {t("honoreeCount", { count: honorees })}
        </p>
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 sm:py-12">
        {categories.length ? (
          <section aria-labelledby="categories-title">
            <SectionHeading id="categories-title" title={t("categories")} />
            <CategoryGrid editionSlug={edition.slug} categories={categories} />
          </section>
        ) : (
          <ComingSoon icon={Trophy} label={t("title")} title={t("noGenres")} />
        )}
        {edition.ceremonyAt || edition.venue ? (
          <section aria-labelledby="dates-title">
            <SectionHeading id="dates-title" title={t("keyDates")} />
            <KeyDates edition={edition} />
          </section>
        ) : null}
      </div>
    </>
  );
}
