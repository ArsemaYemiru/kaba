import { BadgeCheck, CircleAlert, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeleteForm, PasswordForm, PhoneForm, ProfileForm, SignOutAllForm } from "@/components/account/forms";
import { Chip } from "@/components/brand/chip";
import { PageHeader } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { MEMBER_PASSWORD_MIN } from "@/lib/auth-constants";
import { requireViewer } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { STAFF_PASSWORD_MIN } from "@/schemas/auth";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };


function Section({ id, title, lead, children, tone }: { id: string; title: string; lead?: React.ReactNode; children: React.ReactNode; tone?: "danger" }) {
  return (
    <section aria-labelledby={id} className={`rounded-xl border bg-surface p-5 sm:p-6 ${tone === "danger" ? "border-red/40" : "border-line"}`}>
      <h2 id={id} className="font-display text-lg font-bold">
        {title}
      </h2>
      {lead ? <div className="mt-1 text-sm text-muted-foreground">{lead}</div> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Per-member page: read per request, never cached (A-14). */
export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/account">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const v = await requireViewer("/account");
  const [t, settings, credential] = await Promise.all([
    getTranslations("account"),
    getSettings(),
    prisma.account.findFirst({ where: { userId: v.id, providerId: "credential" }, select: { id: true } }),
  ]);
  const passwordChanged = (await searchParams).passwordChanged === "1";
  const phoneOn = getEnv().ENABLE_PHONE_OTP === "1";
  const phoneRequired = settings.voting.requirePhoneVerificationToVote;

  return (
    <>
      <PageHeader title={t("title")} intro={t("lead")}>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/account/ballot">
              <ListChecks /> {t("ballotLink")}
            </Link>
          </Button>
        </div>
      </PageHeader>
      <div className="mx-auto grid max-w-3xl gap-5 px-4 py-10 sm:px-6">
        <Section id="profile-title" title={t("profile")}>
          <ProfileForm displayName={v.name} newsOptIn={v.newsOptIn} />
        </Section>
        <Section id="email-title" title={t("emailSection")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold break-all">{v.email}</span>
            {v.emailVerified ? (
              <Chip variant="foil" size="sm">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> {t("verifiedChip")}
              </Chip>
            ) : (
              <>
                <Chip variant="red" size="sm">
                  <CircleAlert className="size-3.5" aria-hidden="true" /> {t("unverifiedChip")}
                </Chip>
                <Button asChild size="sm">
                  <Link href="/verify?next=/account">{t("verifyNow")}</Link>
                </Button>
              </>
            )}
          </div>
        </Section>
        {phoneOn || phoneRequired ? (
          <Section id="phone-title" title={t("phoneSection")} lead={phoneRequired ? t("phoneRequired") : t("phoneLead")}>
            {v.phoneNumber && v.phoneNumberVerified ? (
              <p className="mb-4 flex flex-wrap items-center gap-3">
                <span className="font-semibold">{v.phoneNumber}</span>
                <Chip variant="foil" size="sm">
                  {t("verifiedChip")}
                </Chip>
              </p>
            ) : null}
            {phoneOn ? <PhoneForm current={v.phoneNumberVerified ? null : v.phoneNumber} /> : null}
          </Section>
        ) : null}
        {credential ? (
          <Section id="password-title" title={t("passwordSection")}>
            {passwordChanged ? (
              <p role="status" className="mb-4 rounded-md border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm">
                {t("passwordChanged")}
              </p>
            ) : null}
            <PasswordForm min={v.isStaff ? STAFF_PASSWORD_MIN : MEMBER_PASSWORD_MIN} />
          </Section>
        ) : null}
        <Section id="devices-title" title={t("devicesSection")} lead={t("devicesLead")}>
          <SignOutAllForm />
        </Section>
        <Section id="delete-title" title={t("deleteSection")} lead={v.isStaff ? t("staffNoDelete") : t("deleteLead")} tone="danger">
          {v.isStaff ? null : <DeleteForm hasPassword={!!credential} />}
        </Section>
      </div>
    </>
  );
}
