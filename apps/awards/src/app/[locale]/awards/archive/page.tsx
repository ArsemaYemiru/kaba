import { ArrowRight, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { TrophyBadge } from "@/components/awards/gold-foil";
import { PageHeader } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { listEditions } from "@/server/queries/awards";

export const metadata: Metadata = { title: "Archive", description: "Every edition of Feta Awards.", alternates: { canonical: "/awards/archive" } };


export default async function ArchivePage({ params }: PageProps<"/[locale]/awards/archive">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, editions] = await Promise.all([getTranslations("awards"), listEditions()]);
  return (
    <>
      <PageHeader kicker={t("title")} title={t("archiveTitle")} intro={t("archiveIntro")} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        {editions.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {editions.map((e) => (
              <li key={e.id}>
                <Link href={`/awards/${e.slug}`} className="group flex h-full items-center gap-5 rounded-lg border border-line bg-surface p-5 transition-[border-color,translate] hover:-translate-y-0.5 hover:border-gold/60">
                  <TrophyBadge size="md" label={String(e.year)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl font-extrabold">{e.year}</span>
                    <span className="block text-sm text-muted-foreground">{e.nameEn}</span>
                  </span>
                  <ArrowRight className="size-5 text-gold transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ComingSoon icon={Trophy} title={t("archiveEmpty")} />
        )}
      </div>
    </>
  );
}
