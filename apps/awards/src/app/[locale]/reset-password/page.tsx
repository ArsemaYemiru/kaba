import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/forms";
import { NO_INDEX } from "@/components/auth/page-helpers";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Choose a new password", ...NO_INDEX };


export default async function ResetPage({ params, searchParams }: PageProps<"/[locale]/reset-password">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = (await searchParams).email;
  const email = z.string().email().max(200).safeParse(Array.isArray(raw) ? raw[0] : raw);
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("resetTitle")}
      lead={t("resetLead")}
      footer={
        <Link href="/forgot-password" className="font-semibold text-gold hover:underline">
          {t("resend")}
        </Link>
      }
    >
      <ResetForm email={email.success ? email.data : undefined} />
    </AuthCard>
  );
}
