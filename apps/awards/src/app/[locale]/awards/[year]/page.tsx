import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Chip } from "@/components/brand/chip";
import { CategoryGrid } from "@/components/awards/category-grid";
import { KeyDates } from "@/components/awards/key-dates";
import { SampleNotice } from "@/components/awards/sample-notice";
import { PageHeader, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getEdition } from "@/server/queries/awards";
import { JsonLd } from "@/components/site/json-ld";
import { eventLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/awards/[year]">): Promise<Metadata> {
  await connection();
  const { year } = await params;
  const data = await getEdition(year);
  if (!data) return {};
  return { title: data.edition.nameEn, description: `Categories, nominees and key dates for ${data.edition.nameEn}.`, alternates: { canonical: `/awards/${year}` }, ...shareImage(`/og/edition/${year}`, data.edition.nameEn) };
}


export default async function EditionPage({ params }: PageProps<"/[locale]/awards/[year]">) {
  await connection();
  const { locale, year } = await params;
  setRequestLocale(locale);
  const data = await getEdition(year);
  if (!data) notFound();
  const { edition, categories } = data;
  const [t, tp, th] = await Promise.all([getTranslations("awards"), getTranslations("phase"), getTranslations("hero")]);
  const draft = edition.phase === "DRAFT";

  return (
    <>
      {eventLd(edition) ? <JsonLd data={eventLd(edition)} /> : null}
      <PageHeader kicker={t("title")} title={edition.nameEn} titleAm={edition.nameAm ?? undefined}>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Chip variant={edition.phase === "WINNERS_ANNOUNCED" ? "foil" : edition.phase === "VOTING_OPEN" ? "red" : "default"}>{tp(edition.phase)}</Chip>
          {!draft ? <span className="text-sm text-muted-foreground">{t("categoryCount", { count: categories.length })}</span> : null}
          {edition.phase === "VOTING_OPEN" ? (
            <Button asChild size="sm">
              <Link href="/vote">{t("vote")}</Link>
            </Button>
          ) : null}
          {edition.phase === "WINNERS_ANNOUNCED" ? (
            <Button asChild size="sm">
              <Link href={`/awards/${edition.slug}/winners`}>{th("seeWinners")}</Link>
            </Button>
          ) : null}
        </div>
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 sm:py-12">
        {edition.isSample ? <SampleNotice /> : null}
        {draft ? (
          <ComingSoon icon={Trophy} label={tp("DRAFT")} title={t("noNominees")} />
        ) : (
          <section aria-labelledby="categories-title">
            <SectionHeading id="categories-title" title={t("categories")} />
            <CategoryGrid editionSlug={edition.slug} categories={categories} />
          </section>
        )}
        <section aria-labelledby="dates-title">
          <SectionHeading id="dates-title" title={t("keyDates")} />
          <KeyDates edition={edition} />
        </section>
      </div>
    </>
  );
}
