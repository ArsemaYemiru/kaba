import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CmsPage } from "@/components/site/cms-page";
import { SectionHeading } from "@/components/site/section-heading";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = {
  title: "About",
  description: "About Feta Awards: celebrating Ethiopian artists, genre by genre.",
  alternates: { canonical: "/about" },
};


export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("about"), getSettings()]);
  const { about, faq } = settings.pages;
  return (
    <CmsPage kicker={t("kicker")} title={t("title")} page={about}>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/awards">{t("awardsCta")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/artists">{t("artistsCta")}</Link>
        </Button>
      </div>
      {faq.length ? (
        <section aria-labelledby="faq-title" className="mt-16">
          <SectionHeading id="faq-title" title={t("faq")} />
          <Accordion type="single" collapsible className="rounded-lg border border-line bg-surface px-5">
            {faq.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{f.qEn}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.aEn}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}
    </CmsPage>
  );
}
