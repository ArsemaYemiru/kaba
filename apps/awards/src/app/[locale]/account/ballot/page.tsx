import { ArrowRight, Check, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { BallotProgress } from "@/components/awards/ballot-progress";
import { CategoryIcon } from "@/components/awards/category-icons";
import { PageHeader } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { requireViewer } from "@/lib/authz";
import { nomineeNames } from "@/lib/phase";
import { formatEat } from "@/lib/time";
import { getBallot, getCurrentEdition } from "@/server/queries/awards";
import { memberPicks } from "@/server/queries/member";

export const metadata: Metadata = { title: "My ballot", robots: { index: false, follow: false } };


export default async function MyBallotPage({ params }: PageProps<"/[locale]/account/ballot">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const v = await requireViewer("/account/ballot");
  const [t, tb, tc] = await Promise.all([getTranslations("account"), getTranslations("ballot"), getTranslations("common")]);
  const edition = await getCurrentEdition();
  const ballot = edition && edition.phase !== "DRAFT" ? await getBallot(edition.id) : null;
  if (!edition || !ballot) {
    return (
      <>
        <PageHeader title={t("ballotTitle")} />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <ComingSoon icon={Trophy} variant="compact" title={t("noEdition")} />
        </div>
      </>
    );
  }
  const picks = await memberPicks(v.id, edition.id);
  const open = edition.phase === "VOTING_OPEN";
  const done = ballot.categories.filter((c) => picks.has(c.id)).length;

  return (
    <>
      <PageHeader title={t("ballotTitle")} intro={t("ballotLead", { edition: edition.nameEn })}>
        {open && edition.votingClosesAt ? <p className="mt-3 text-sm text-muted-foreground">{t("ballotOpenUntil", { date: `${formatEat(edition.votingClosesAt)} ${tc("eat")}` })}</p> : null}
      </PageHeader>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <BallotProgress done={done} total={ballot.categories.length} label={tb("progress", { done, total: ballot.categories.length })} completeLabel={tb("complete")} />
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {ballot.categories.map((c) => {
            const pick = picks.get(c.id);
            const nominee = pick ? c.nominees.find((n) => n.id === pick.nomineeId) : undefined;
            const names = nominee ? nomineeNames(nominee) : null;
            return (
              <li key={c.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${pick ? "border-gold bg-gold text-bg" : "border-line text-muted-foreground"}`}>
                  {pick ? <Check className="size-5" aria-hidden="true" /> : <CategoryIcon name={c.icon} className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold tracking-[0.15em] text-gold uppercase">{c.nameEn}</span>
                  <span className={`block truncate font-semibold ${names ? "" : "text-muted-foreground"}`}>{names ? names.name : t("notVoted")}</span>
                  {names?.credit ? <span className="block truncate text-sm text-muted-foreground">{names.credit}</span> : null}
                </span>
                {open ? (
                  <Link href={`/vote#${c.slug}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-gold hover:underline">
                    {pick ? t("change") : t("voteInCategory")} <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
