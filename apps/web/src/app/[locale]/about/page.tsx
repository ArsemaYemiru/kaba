import { connection } from "next/server";
import { ArrowRight, Flag, Swords, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortraitFallback } from "@/components/brand/fallback";
import { Reveal } from "@/components/brand/reveal";
import { MediaImage } from "@/components/site/media-image";
import { PageHeader, SectionHeading } from "@/components/site/section-heading";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = {
  title: "About",
  description: "Feta (ፈታ) is a celebrity game show that launched on EBS TV in 2016.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("about"), getSettings()]);
  const { about, footer } = settings;
  const steps = [
    { icon: Users, title: t("step1Title"), body: t("step1Body") },
    { icon: Swords, title: t("step2Title"), body: t("step2Body") },
    { icon: Flag, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <>
      <PageHeader kicker={t("kicker")} title={t("title")}>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-red" />
          {footer.broadcastLine}
        </p>
      </PageHeader>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        {about.storyEn ? <p className="max-w-3xl text-xl leading-relaxed text-pretty sm:text-2xl">{about.storyEn}</p> : null}
        {about.storyAm ? (
          <p lang="am" className="mt-6 max-w-3xl text-lg">
            {about.storyAm}
          </p>
        ) : null}

        <section aria-labelledby="how-title" className="mt-16">
          <SectionHeading id="how-title" title={t("howItWorks")} />
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title}>
                <Reveal index={i} className="h-full rounded-lg border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="size-6 text-gold" aria-hidden="true" />
                    <span className="font-display text-3xl font-extrabold text-foreground/10 tabular-nums">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {about.team.length ? (
          <section aria-labelledby="team-title" className="mt-16">
            <SectionHeading id="team-title" title={t("team")} />
            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {about.team.map((m) => {
                const photo = m.photoId ? settings.media[m.photoId] : undefined;
                return (
                  <li key={m.name} className="text-center">
                    <div className="relative mx-auto aspect-square w-full max-w-40 overflow-hidden rounded-full border border-line">
                      {photo ? <MediaImage media={photo} sizes="160px" fill /> : <PortraitFallback name={m.name} />}
                    </div>
                    <p className="mt-3 font-display font-bold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.roleEn}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {about.faq.length ? (
          <section aria-labelledby="faq-title" className="mt-16">
            <SectionHeading id="faq-title" title={t("faq")} />
            <Accordion type="single" collapsible className="rounded-lg border border-line bg-surface px-5">
              {about.faq.map((f, i) => (
                <AccordionItem key={i} value={`q${i}`} className="border-line">
                  <AccordionTrigger className="py-5 text-left font-display text-base font-bold hover:no-underline">{f.qEn}</AccordionTrigger>
                  <AccordionContent className="pb-5 text-base text-muted-foreground">{f.aEn}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ) : null}

        <div className="mt-16 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/episodes">
              {t("watchCta")} <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/join">{t("joinCta")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
