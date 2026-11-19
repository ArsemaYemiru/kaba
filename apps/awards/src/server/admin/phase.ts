import type { EditionPhase } from "@/generated/prisma/enums";

/**
 * Edition phase machine (spec §6, A-16): forward one step at a time; going back
 * one step needs a written reason. Opening voting needs both voting dates
 * (opens < closes); publishing winners needs locked results.
 */
export const PHASES: EditionPhase[] = ["DRAFT", "NOMINEES_ANNOUNCED", "VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"];

export const PHASE_LABEL: Record<EditionPhase, string> = {
  DRAFT: "Draft",
  NOMINEES_ANNOUNCED: "Nominees announced",
  VOTING_OPEN: "Voting open",
  VOTING_CLOSED: "Voting closed",
  WINNERS_ANNOUNCED: "Winners announced",
};

export type PhaseCheck = {
  from: EditionPhase;
  to: EditionPhase;
  reason?: string | null;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  hasLockedSnapshot: boolean;
  publishedCategories: number;
};

export function checkPhaseChange(c: PhaseCheck): { ok: true; direction: "forward" | "back" } | { ok: false; error: string } {
  const a = PHASES.indexOf(c.from);
  const b = PHASES.indexOf(c.to);
  if (a === b) return { ok: false, error: "The edition is already in that phase." };
  if (Math.abs(a - b) !== 1) return { ok: false, error: `Phases move one step at a time (${PHASE_LABEL[c.from]} → ${PHASE_LABEL[PHASES[a + (b > a ? 1 : -1)]!]}).` };
  if (b < a) {
    if (!c.reason || c.reason.trim().length < 5) return { ok: false, error: "Going back a phase needs a written reason (at least 5 characters)." };
    return { ok: true, direction: "back" };
  }
  if (c.to === "NOMINEES_ANNOUNCED" && c.publishedCategories === 0) return { ok: false, error: "Publish at least one category before announcing nominees." };
  if (c.to === "VOTING_OPEN") {
    if (!c.votingOpensAt || !c.votingClosesAt) return { ok: false, error: "Set both voting dates (opens and closes) before opening voting." };
    if (c.votingOpensAt >= c.votingClosesAt) return { ok: false, error: "Voting must close after it opens." };
  }
  if (c.to === "WINNERS_ANNOUNCED" && !c.hasLockedSnapshot) return { ok: false, error: "Lock the results before publishing winners." };
  return { ok: true, direction: "forward" };
}
