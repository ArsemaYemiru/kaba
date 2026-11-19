/**
 * Who may vote (spec §5.2), as a pure rule so it can be unit-tested and
 * reused by the ballot UI and `castVote` (Phase 5). The server always
 * re-checks with fresh DB values.
 */
export type EligibilityInput = {
  user: { emailVerified: boolean; phoneNumberVerified: boolean; isActive: boolean; banned: boolean; banExpires?: Date | null } | null;
  requirePhoneVerification: boolean;
  now?: Date;
};

export type Ineligible = "SIGNED_OUT" | "UNVERIFIED_EMAIL" | "UNVERIFIED_PHONE" | "INACTIVE" | "BANNED";

export function voteEligibility({ user, requirePhoneVerification, now = new Date() }: EligibilityInput): { ok: true } | { ok: false; reason: Ineligible } {
  if (!user) return { ok: false, reason: "SIGNED_OUT" };
  if (!user.isActive) return { ok: false, reason: "INACTIVE" };
  if (user.banned && (!user.banExpires || user.banExpires > now)) return { ok: false, reason: "BANNED" };
  if (!user.emailVerified) return { ok: false, reason: "UNVERIFIED_EMAIL" };
  if (requirePhoneVerification && !user.phoneNumberVerified) return { ok: false, reason: "UNVERIFIED_PHONE" };
  return { ok: true };
}
