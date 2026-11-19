import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendForm, VerifyForm } from "@/components/auth/forms";
import { NO_INDEX, nextParam } from "@/components/auth/page-helpers";
import { Link } from "@/i18n/navigation";
import { requireViewer } from "@/lib/authz";
import { peek } from "@/lib/rate-limit";

export const metadata: Metadata = { title: "Verify your email", ...NO_INDEX };


export default async function VerifyPage({ params, searchParams }: PageProps<"/[locale]/verify">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const next = nextParam(await searchParams, "/vote");
  const v = await requireViewer(`/verify?next=${encodeURIComponent(next)}`);
  if (v.emailVerified) redirect(next);
  const t = await getTranslations("auth");
  // A code was just sent at sign-up; respect the cooldown already running.
  const recent = (await peek(`otp-resend:${v.id}`)) > 0;
  return (
    <AuthCard
      title={t("verifyTitle")}
      lead={
        <>
          <p className="flex items-start gap-2">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{t("verifyLead", { email: v.email })}</span>
          </p>
          <p className="mt-1">{t("checkInbox")}</p>
        </>
      }
      footer={
        <Link href={next} className="hover:text-foreground hover:underline">
          {t("verifyLater")}
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <VerifyForm next={next} />
        <ResendForm initialWait={recent ? 60 : 0} />
      </div>
    </AuthCard>
  );
}
