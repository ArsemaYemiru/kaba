import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/forms";
import { GoogleButton } from "@/components/auth/google-button";
import { NO_INDEX, nextParam } from "@/components/auth/page-helpers";
import { Link } from "@/i18n/navigation";
import { getViewer } from "@/lib/authz";
import { getEnv } from "@/lib/env";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Create an account", ...NO_INDEX };


export default async function SignUpPage({ params, searchParams }: PageProps<"/[locale]/sign-up">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const next = nextParam(await searchParams, "/vote");
  if (await getViewer()) redirect(next);
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("signUpTitle")}
      lead={t("signUpLead")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-gold hover:underline">
            {t("signInLink")}
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {getEnv().GOOGLE_CLIENT_ID ? (
          <>
            <GoogleButton label={t("google")} callbackURL={next} inAppTitle={t("inAppTitle")} inAppBody={t("inAppBody")} consent={t("googleConsent")} />
            <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t("or")}</p>
          </>
        ) : null}
        <SignUpForm siteKey={turnstileSiteKey()} next={next} />
      </div>
    </AuthCard>
  );
}
