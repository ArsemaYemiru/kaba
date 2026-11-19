import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorForm } from "@/components/auth/forms";
import { NO_INDEX, nextParam } from "@/components/auth/page-helpers";

export const metadata: Metadata = { title: "Two-step verification", ...NO_INDEX };


export default async function TwoFactorPage({ params, searchParams }: PageProps<"/[locale]/two-factor">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const next = nextParam(await searchParams, "/admin");
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("twoFactorTitle")} lead={t("twoFactorLead")}>
      <TwoFactorForm next={next} />
    </AuthCard>
  );
}
