import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/forms";
import { FormMessage } from "@/components/auth/fields";
import { NO_INDEX, nextParam } from "@/components/auth/page-helpers";
import { getViewer } from "@/lib/authz";

export const metadata: Metadata = { title: "Staff sign in", ...NO_INDEX };


export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const next = nextParam(raw);
  if (await getViewer()) redirect(next === "/" ? "/admin" : next);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("signInTitle")} lead={t("signInLead")}>
      <div className="flex flex-col gap-5">
        {raw.reset ? <FormMessage notice={t("resetDone")} /> : null}
        {raw.signedOut ? <FormMessage notice={t("signedOut")} /> : null}
        <SignInForm next={next === "/" ? undefined : next} />
      </div>
    </AuthCard>
  );
}
