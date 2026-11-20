import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forms";
import { NO_INDEX } from "@/components/auth/page-helpers";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Reset your password", ...NO_INDEX };


export default async function ForgotPage({ params }: PageProps<"/[locale]/forgot-password">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("forgotTitle")}
      lead={t("forgotLead")}
      footer={
        <Link href="/sign-in" className="font-semibold text-gold hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <ForgotForm />
    </AuthCard>
  );
}
