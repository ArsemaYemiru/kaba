import type { EditionPhase, Status, VotingType } from "@/generated/prisma/enums";

/**
 * The vote-target rules of spec §5.2 as a pure function (unit-tested; the cast
 * transaction calls it with rows read inside the transaction and the DB clock).
 */
export type VoteTarget = {
  edition: { status: Status; phase: EditionPhase; votingOpensAt: Date | null; votingClosesAt: Date | null };
  category: { id: string; status: Status; votingType: VotingType };
  nominee: { categoryId: string; status: Status };
  requestedCategoryId: string;
  now: Date;
};

export type TargetRejection = "NOT_OPEN" | "OUTSIDE_WINDOW" | "CATEGORY_UNAVAILABLE" | "NOT_VOTABLE" | "WRONG_CATEGORY" | "NOMINEE_UNAVAILABLE";

export function checkVoteTarget(t: VoteTarget): { ok: true } | { ok: false; reason: TargetRejection } {
  if (t.nominee.categoryId !== t.requestedCategoryId || t.category.id !== t.requestedCategoryId) return { ok: false, reason: "WRONG_CATEGORY" };
  if (t.edition.status !== "PUBLISHED" || t.edition.phase !== "VOTING_OPEN") return { ok: false, reason: "NOT_OPEN" };
  const { votingOpensAt: opens, votingClosesAt: closes } = t.edition;
  // [opensAt, closesAt): open at the opening instant, closed at the closing instant.
  if (!opens || !closes || t.now < opens || t.now >= closes) return { ok: false, reason: "OUTSIDE_WINDOW" };
  if (t.category.status !== "PUBLISHED") return { ok: false, reason: "CATEGORY_UNAVAILABLE" };
  if (t.category.votingType !== "PUBLIC_VOTE" && t.category.votingType !== "HYBRID") return { ok: false, reason: "NOT_VOTABLE" };
  if (t.nominee.status !== "PUBLISHED") return { ok: false, reason: "NOMINEE_UNAVAILABLE" };
  return { ok: true };
}
