import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { JoinForms } from "@/components/site/join-forms";
import { PageHeader } from "@/components/site/section-heading";

export const metadata: Metadata = {
  title: "Join",
  description: "Apply to be a contestant, join the studio audience, or partner with Feta.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("join");
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-[40rem]" />}>
          <JoinForms />
        </Suspense>
      </div>
    </>
  );
}
