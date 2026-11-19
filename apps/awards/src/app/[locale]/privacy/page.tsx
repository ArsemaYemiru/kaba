import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CmsPage } from "@/components/site/cms-page";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Privacy", description: "How Feta Awards collects and uses your information.", alternates: { canonical: "/privacy" } };


export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("legal"), getSettings()]);
  return <CmsPage title={t("privacy")} page={settings.pages.privacy} />;
}
