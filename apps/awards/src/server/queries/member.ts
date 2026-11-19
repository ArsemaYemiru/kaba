import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { voteEligibility, type Ineligible } from "@/server/voting/eligibility";
import { getSettings } from "./settings";

/**
 * A member's own picks (never cached; A-14). Only their own rows, never counts.
 * Voided votes don't count, so they're not shown as a current pick.
 */
export async function memberPicks(userId: string, editionId: string) {
  const rows = await prisma.vote.findMany({
    where: { userId, editionId, voidedAt: null },
    select: { categoryId: true, nomineeId: true, updatedAt: true },
  });
  return new Map(rows.map((r) => [r.categoryId, r]));
}

export type BallotViewer = {
  signedIn: boolean;
  email?: string;
  eligible: boolean;
  reason?: Ineligible;
  picks: Map<string, { categoryId: string; nomineeId: string; updatedAt: Date }>;
};

/** Per-request ballot state for the signed-in member (React cache: one query per request). */
export const ballotViewer = cache(async (editionId: string): Promise<BallotViewer> => {
  const v = await getViewer();
  if (!v) return { signedIn: false, eligible: false, reason: "SIGNED_OUT", picks: new Map() };
  const settings = await getSettings();
  const e = voteEligibility({
    user: { emailVerified: v.emailVerified, phoneNumberVerified: v.phoneNumberVerified, isActive: true, banned: v.banned },
    requirePhoneVerification: settings.voting.requirePhoneVerificationToVote,
  });
  return { signedIn: true, email: v.email, eligible: e.ok, reason: e.ok ? undefined : e.reason, picks: await memberPicks(v.id, editionId) };
});
