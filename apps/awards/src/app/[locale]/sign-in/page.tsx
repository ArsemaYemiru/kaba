import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/forms";
import { GoogleButton } from "@/components/auth/google-button";
import { FormMessage } from "@/components/auth/fields";
import { NO_INDEX, nextParam } from "@/components/auth/page-helpers";
import { Link } from "@/i18n/navigation";
import { getViewer } from "@/lib/authz";
import { getEnv } from "@/lib/env";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Sign in", ...NO_INDEX };


export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const next = nextParam(raw);
  if (await getViewer()) redirect(next);
  const t = await getTranslations("auth");
  const env = getEnv();
  return (
    <AuthCard
      title={t("signInTitle")}
      lead={t("signInLead")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href={next === "/" ? "/sign-up" : `/sign-up?next=${encodeURIComponent(next)}`} className="font-semibold text-gold hover:underline">
            {t("signUpLink")}
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {raw.reset ? <FormMessage notice={t("resetDone")} /> : null}
        {raw.signedOut ? <FormMessage notice={t("signedOut")} /> : null}
        {env.GOOGLE_CLIENT_ID ? (
          <>
            <GoogleButton label={t("google")} callbackURL={next} inAppTitle={t("inAppTitle")} inAppBody={t("inAppBody")} consent={t("googleConsent")} />
            <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t("or")}</p>
          </>
        ) : null}
        <SignInForm siteKey={turnstileSiteKey()} next={next === "/" ? undefined : next} />
      </div>
    </AuthCard>
  );
}
