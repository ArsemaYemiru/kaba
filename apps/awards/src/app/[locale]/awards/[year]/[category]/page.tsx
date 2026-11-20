import { ArrowLeft, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Reveal } from "@/components/brand/reveal";
import { CategoryIcon } from "@/components/awards/category-icons";
import { HonoreeCard } from "@/components/awards/honoree-card";
import { SampleNotice } from "@/components/awards/sample-notice";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { getCategory, getEdition } from "@/server/queries/awards";

export async function generateMetadata({ params }: PageProps<"/[locale]/awards/[year]/[category]">): Promise<Metadata> {
  await connection();
  const { year, category } = await params;
  const data = await getCategory(year, category);
  if (!data) return {};
  return {
    title: `${data.category.nameEn} · ${data.edition.year}`,
    description: data.category.descriptionEn ?? `The artists honored in ${data.category.nameEn} at ${data.edition.nameEn}.`,
    alternates: { canonical: `/awards/${year}/${category}` },
    ...shareImage(`/og/category/${year}/${category}`, data.category.nameEn),
  };
}

/** A genre within an edition: every honored artist, shown equally (A-76). */
export default async function CategoryPage({ params }: PageProps<"/[locale]/awards/[year]/[category]">) {
  await connection();
  const { locale, year, category: slug } = await params;
  setRequestLocale(locale);
  const [data, full] = await Promise.all([getCategory(year, slug), getEdition(year)]);
  if (!data) notFound();
  const { edition, category, honorees } = data;
  const [t, tc, th] = await Promise.all([getTranslations("awards"), getTranslations("category"), getTranslations("honoree")]);
  const others = (full?.categories ?? []).filter((c) => c.slug !== category.slug);
  const am = locale === "am";
  const name = (am && category.nameAm) || category.nameEn;
  const description = (am && category.descriptionAm) || category.descriptionEn;

  return (
    <>
      <header className="grain relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="glow-gold absolute -top-1/2 left-1/2 size-[min(900px,140vw)] -translate-x-1/2" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6">
          <Link href={`/awards/${edition.slug}`} className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("backTo", { year: edition.year })}
          </Link>
          <div className="mt-5 flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-bg/60 text-gold">
              <CategoryIcon name={category.icon} className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{(am && edition.nameAm) || edition.nameEn}</p>
              <h1 className="mt-1 font-display text-h1 font-extrabold text-balance">{name}</h1>
              {!am && category.nameAm ? (
                <p lang="am" className="mt-1 text-xl font-bold text-gold">
                  {category.nameAm}
                </p>
              ) : null}
            </div>
          </div>
          {description ? <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">{description}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Chip variant="muted">{tc("honorees", { count: honorees.length })}</Chip>
            {category.isSample ? <Chip variant="sample">{th("sample")}</Chip> : null}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 sm:py-12">
        {category.isSample ? <SampleNotice /> : null}
        <section aria-labelledby="honorees-title">
          <h2 id="honorees-title" className="sr-only">
            {t("honorees")}
          </h2>
          {honorees.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {honorees.map((h, i) => (
                <li key={h.id} id={h.slug}>
                  <Reveal index={i} className="h-full">
                    <HonoreeCard honoree={h} />
                  </Reveal>
                </li>
              ))}
            </ul>
          ) : (
            <ComingSoon icon={Trophy} variant="compact" title={t("noHonorees")} />
          )}
        </section>
        {others.length ? (
          <section aria-labelledby="others-title">
            <SectionHeading id="others-title" title={t("otherCategories")} />
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {others.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link href={`/awards/${edition.slug}/${c.slug}`} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-gold/60 hover:text-gold">
                    <CategoryIcon name={c.icon} className="size-4" /> {(am && c.nameAm) || c.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
