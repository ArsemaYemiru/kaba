import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CmsPage } from "@/components/site/cms-page";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Voting rules", description: "Who can vote, how voting works and how Feta Awards winners are decided.", alternates: { canonical: "/rules" } };


export default async function RulesPage({ params }: PageProps<"/[locale]/rules">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("legal"), getSettings()]);
  return <CmsPage title={t("rules")} page={settings.pages.rules} />;
}
