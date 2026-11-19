import { CalendarClock, ListChecks, Lock, MailCheck, Trophy, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Chip } from "@/components/brand/chip";
import { BallotProgress } from "@/components/awards/ballot-progress";
import { CategoryIcon } from "@/components/awards/category-icons";
import { NomineeTile } from "@/components/awards/nominee-tile";
import { SampleNotice } from "@/components/awards/sample-notice";
import { MemberBallot } from "@/components/vote/member-ballot";
import { PageHeader } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatEat } from "@/lib/time";
import { getBallot, getCurrentEdition } from "@/server/queries/awards";
import { ballotViewer } from "@/server/queries/member";

export const metadata: Metadata = { title: "Vote", description: "Vote for your favourites in every Feta Awards category.", alternates: { canonical: "/vote" } };


/**
 * The ballot (spec §4.2), signed-out view: every public-vote category with
 * its nominees and a sign-in prompt. Phase 5 adds the member ballot.
 */
export default async function VotePage({ params }: PageProps<"/[locale]/vote">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const edition = await getCurrentEdition();
  const [t, tb, tv, tc] = await Promise.all([getTranslations("ballot"), getTranslations("awards"), getTranslations("votingType"), getTranslations("common")]);
  const ballot = edition && edition.phase !== "DRAFT" ? await getBallot(edition.id) : null;

  if (!edition || !ballot) {
    return (
      <>
        <PageHeader title={t("title")} intro={t("intro")} />
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <ComingSoon icon={Trophy} title={t("noEdition")} />
        </div>
      </>
    );
  }
  const { categories } = ballot;
  const open = edition.phase === "VOTING_OPEN";
  const viewer = await ballotViewer(edition.id);
  const done = categories.filter((c) => viewer.picks.has(c.id)).length;
  const progress = <BallotProgress done={done} total={categories.length} label={t("progress", { done, total: categories.length })} completeLabel={t("complete")} className="relative mt-6" />;

  return (
    <>
      <PageHeader kicker={edition.nameEn} title={t("title")} intro={t("intro")}>
        {categories.length ? (
          <nav aria-label={t("jumpTo")} className="mt-6">
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {categories.map((c) => (
                <li key={c.id} className="shrink-0">
                  <a href={`#${c.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-gold/60 hover:text-gold">
                    <CategoryIcon name={c.icon} className="size-3.5" /> {c.nameEn}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
        {edition.isSample ? <SampleNotice /> : null}

        {open && !viewer.signedIn ? (
          <section aria-labelledby="signin-title" className="grain relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-6 sm:p-8">
            <div aria-hidden="true" className="glow-gold absolute -right-24 -bottom-24 size-96 opacity-60" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-gold text-bg sm:flex">
                  <UserRound className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="signin-title" className="font-display text-xl font-bold sm:text-2xl">
                    {t("signInTitle")}
                  </h2>
                  <p className="mt-1 max-w-xl text-muted-foreground">{t("signInBody")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/sign-in?next=/vote">{t("signIn")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/sign-up?next=/vote">{t("signUp")}</Link>
                </Button>
              </div>
            </div>
            {progress}
          </section>
                ) : open && !viewer.eligible ? (
          <Panel
            id="verify-title"
            icon={<MailCheck className="size-6" aria-hidden="true" />}
            title={viewer.reason === "UNVERIFIED_PHONE" ? t("phoneTitle") : t("verifyTitle")}
            body={viewer.reason === "UNVERIFIED_PHONE" ? t("phoneBody") : t("verifyBody", { email: viewer.email ?? "" })}
            action={
              <Button asChild size="lg">
                <Link href={viewer.reason === "UNVERIFIED_PHONE" ? "/account" : "/verify?next=/vote"}>{viewer.reason === "UNVERIFIED_PHONE" ? t("phoneCta") : t("verifyCta")}</Link>
              </Button>
            }
          >
            {progress}
          </Panel>
        ) : open ? (
          <Panel id="member-title" icon={<ListChecks className="size-6" aria-hidden="true" />} title={t("memberTitle")} body={t("memberBody")}>
            {progress}
          </Panel>
) : edition.phase === "NOMINEES_ANNOUNCED" ? (
          <ComingSoon
            icon={CalendarClock}
            variant="compact"
            title={t("notOpenTitle")}
            body={edition.votingOpensAt ? t("notOpenBody", { date: `${formatEat(edition.votingOpensAt)} ${tc("eat")}` }) : t("notOpenUndated")}
          />
        ) : (
          <ComingSoon icon={Lock} variant="compact" title={t("closedTitle")} body={t("closedBody")} />
        )}

        <MemberBallot editionId={edition.id} year={edition.year} open={open}>
        {categories.map((c) => (
          <section key={c.id} id={c.slug} aria-labelledby={`${c.slug}-title`} className="scroll-mt-32">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <div>
                  <h2 id={`${c.slug}-title`} className="font-display text-xl font-bold sm:text-2xl">
                    {c.nameEn}
                  </h2>
                  {c.nameAm ? (
                    <p lang="am" className="text-sm text-muted-foreground">
                      {c.nameAm}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip size="sm">{tv(c.votingType)}</Chip>
                <Link href={`/awards/${edition.slug}/${c.slug}`} className="text-sm font-semibold text-gold hover:underline">
                  {tb("nominees")}
                </Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-5">
              {c.nominees.map((n) => (
                <li key={n.id}>
                  <NomineeTile nominee={n} category={c} editionId={edition.id} phase={edition.phase} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        </MemberBallot>
      </div>
    </>
  );
}

function Panel({ id, icon, title, body, action, children }: { id: string; icon: React.ReactNode; title: string; body: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grain relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-6 sm:p-8">
      <div aria-hidden="true" className="glow-gold absolute -right-24 -bottom-24 size-96 opacity-60" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-gold text-bg sm:flex">{icon}</span>
          <div>
            <h2 id={id} className="font-display text-xl font-bold sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 max-w-xl text-muted-foreground">{body}</p>
          </div>
        </div>
        {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
