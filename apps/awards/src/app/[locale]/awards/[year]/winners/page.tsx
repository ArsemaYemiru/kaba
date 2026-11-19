import { ArrowLeft, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { FoilText } from "@/components/awards/gold-foil";
import { SampleNotice } from "@/components/awards/sample-notice";
import { WinnersGrid } from "@/components/awards/winners-grid";
import { Link } from "@/i18n/navigation";
import { getWinners } from "@/server/queries/awards";

export async function generateMetadata({ params }: PageProps<"/[locale]/awards/[year]/winners">): Promise<Metadata> {
  await connection();
  const { year } = await params;
  const data = await getWinners(year);
  if (!data) return {};
  return { title: `Winners · ${data.edition.year}`, description: `The winners of ${data.edition.nameEn}.`, alternates: { canonical: `/awards/${year}/winners` }, ...shareImage(`/og/edition/${year}`, `Winners · ${data.edition.nameEn}`) };
}


export default async function WinnersPage({ params }: PageProps<"/[locale]/awards/[year]/winners">) {
  await connection();
  const { locale, year } = await params;
  setRequestLocale(locale);
  const data = await getWinners(year);
  if (!data) notFound();
  const { edition, winners } = data;
  const t = await getTranslations("awards");
  return (
    <>
      <header className="grain relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="glow-gold absolute -top-1/2 left-1/2 size-[min(900px,140vw)] -translate-x-1/2" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6">
          <Link href={`/awards/${edition.slug}`} className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("backTo", { year: edition.year })}
          </Link>
          <p className="mt-5 font-display text-[0.6875rem] font-bold tracking-[0.3em] text-gold uppercase">{edition.nameEn}</p>
          <h1 className="mt-2 font-display text-h1 font-extrabold">
            <FoilText>{t("winnersTitle")}</FoilText>
          </h1>
          <p className="mt-3 text-muted-foreground">{t("winnersIntro", { year: edition.year })}</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 sm:py-12">
        {edition.isSample && winners.length ? <SampleNotice /> : null}
        {winners.length ? <WinnersGrid winners={winners} /> : <ComingSoon icon={Trophy} title={t("winnersSoonTitle")} body={t("winnersSoonBody")} />}
      </div>
    </>
  );
}
