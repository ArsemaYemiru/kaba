import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CmsPage } from "@/components/site/cms-page";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Terms", description: "Terms of use for the Feta Awards website.", alternates: { canonical: "/terms" } };


export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("legal"), getSettings()]);
  return <CmsPage title={t("terms")} page={settings.pages.terms} />;
}
