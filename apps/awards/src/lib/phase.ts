import type { EditionPhase, VotingType } from "@/generated/prisma/enums";

type Dates = { phase: EditionPhase; votingOpensAt: Date | null; votingClosesAt: Date | null; ceremonyAt: Date | null };
export type MilestoneKey = "votingOpens" | "votingCloses" | "ceremony";

/** The next milestone the public counts down to, by phase (spec §3.4). */
export function nextMilestone(e: Dates): { key: MilestoneKey; target: Date } | null {
  const pick = (key: MilestoneKey, d: Date | null) => (d ? { key, target: d } : null);
  switch (e.phase) {
    case "DRAFT":
    case "NOMINEES_ANNOUNCED":
      return pick("votingOpens", e.votingOpensAt);
    case "VOTING_OPEN":
      return pick("votingCloses", e.votingClosesAt);
    case "VOTING_CLOSED":
      return pick("ceremony", e.ceremonyAt);
    default:
      return null;
  }
}

/** The next milestone, only while it's still in the future (pages are rendered per request). */
export function upcomingMilestone(e: Dates, now = Date.now()) {
  const m = nextMilestone(e);
  return m && m.target.getTime() > now ? m : null;
}

/** Phase-banner template key for a milestone ("closes in {time}" etc.). */
export const MILESTONE_TEMPLATE: Record<MilestoneKey, "opensIn" | "closesIn" | "ceremonyIn"> = {
  votingOpens: "opensIn",
  votingCloses: "closesIn",
  ceremony: "ceremonyIn",
};

export const isVotable = (t: VotingType) => t === "PUBLIC_VOTE" || t === "HYBRID";
export const nomineesVisible = (p: EditionPhase) => p !== "DRAFT";

/** Work nominees show the work as the name and the credited artist below (A-35). */
export function nomineeNames(n: { displayNameEn: string; displayNameAm: string | null; workTitleEn: string | null; workTitleAm: string | null }) {
  return n.workTitleEn
    ? { name: n.workTitleEn, nameAm: n.workTitleAm, credit: n.displayNameEn }
    : { name: n.displayNameEn, nameAm: n.displayNameAm, credit: null };
}
