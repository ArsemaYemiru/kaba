import { Gavel, Medal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isVotable, nomineeNames } from "@/lib/phase";
import type { NomineeData } from "@/server/queries/awards";
import { ballotViewer } from "@/server/queries/member";
import type { EditionPhase, NomineeType, VotingType } from "@/generated/prisma/enums";
import { VoteButton } from "@/components/vote/vote-button";
import { NomineeCard } from "./nominee-card";

/**
 * NomineeCard bound to data and the viewer: "Sign in to vote" (signed out),
 * "Verify email to vote" (unverified), the member's current pick marked
 * "Your vote", a locked control outside voting, foil frame for announced
 * winners. Eligible members get the live VoteButton (inside a MemberBallot).
 */
export async function NomineeTile({
  nominee,
  category,
  editionId,
  phase,
  showCategory,
  sizes,
}: {
  nominee: NomineeData;
  category: { id: string; slug: string; nameEn: string; nomineeType: NomineeType; votingType: VotingType };
  editionId: string;
  phase: EditionPhase;
  showCategory?: boolean;
  sizes?: string;
}) {
  const [t, tv, viewer] = await Promise.all([getTranslations("nominee"), getTranslations("votingType"), ballotViewer(editionId)]);
  const { name, nameAm, credit } = nomineeNames(nominee);
  const votable = isVotable(category.votingType);
  const open = phase === "VOTING_OPEN";
  const picked = viewer.picks.get(category.id)?.nomineeId === nominee.id;
  const state = nominee.isWinner ? "winner" : picked && votable ? "selected" : open && votable ? "default" : "disabled";
  const anchor = `/vote#${category.slug}`;
  const action =
    nominee.isWinner ? undefined : !votable ? (
      <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-line text-xs font-semibold text-muted-foreground">
        {category.votingType === "HONORARY" ? <Medal className="size-3.5" aria-hidden="true" /> : <Gavel className="size-3.5" aria-hidden="true" />}
        {tv(category.votingType)}
      </span>
    ) : open && viewer.eligible ? (
      <VoteButton categoryId={category.id} nomineeId={nominee.id} name={name} categoryName={category.nameEn} href={`/nominees/${nominee.slug}`} />
    ) : picked ? undefined : open && !viewer.signedIn ? (
      <Link
        href={`/sign-in?next=${encodeURIComponent(anchor)}`}
        aria-label={`${t("signInToVote")}: ${name}`}
        className="flex h-10 w-full items-center justify-center rounded-full bg-gold text-sm font-bold text-bg transition-colors hover:bg-gold-light"
      >
        {t("signInToVote")}
      </Link>
    ) : open && !viewer.eligible ? (
      <Link
        href={viewer.reason === "UNVERIFIED_PHONE" ? "/account" : `/verify?next=${encodeURIComponent(anchor)}`}
        aria-label={`${t("verifyToVote")}: ${name}`}
        className="flex h-10 w-full items-center justify-center rounded-full border-2 border-gold text-sm font-bold text-gold transition-colors hover:bg-gold/10"
      >
        {t("verifyToVote")}
      </Link>
    ) : undefined;
  return (
    <NomineeCard
      name={name}
      nameAm={nameAm}
      credit={credit}
      type={category.nomineeType}
      categoryLabel={showCategory ? category.nameEn : undefined}
      imageUrl={nominee.image?.url}
      imageAlt={nominee.image?.alt || name}
      blurDataUrl={nominee.image?.blurDataUrl}
      href={`/nominees/${nominee.slug}`}
      state={state}
      sample={nominee.isSample}
      action={action}
      sizes={sizes}
      labels={{ vote: t("vote"), yourVote: t("yourVote"), closed: t("votingClosed"), winner: t("winner"), sample: t("sample"), by: (a) => t("by", { artist: a }) }}
    />
  );
}
