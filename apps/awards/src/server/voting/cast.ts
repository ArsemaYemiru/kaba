import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { hit } from "@/lib/rate-limit";
import { voteHash } from "@/lib/vote-hash";
import { getSettings } from "@/server/queries/settings";
import { verifyBallotSession } from "./ballot-session";
import { voteEligibility, type Ineligible } from "./eligibility";
import { checkVoteTarget, type TargetRejection } from "./rules";

/**
 * castVote (spec §5.2, A-12). Every rule is checked on the server, in this order:
 * eligibility (fresh DB read) → ballot session → rate limits → inside one
 * transaction with the DB clock: edition open + window, category votable,
 * nominee published and in the category → insert or move the member's single
 * vote for the category and append a VoteEvent. Never returns counts.
 */
export const MEMBER_VOTES_PER_MINUTE = 20;
export const IP_VOTES_PER_MINUTE = 60;

export type VoteRejection = Ineligible | TargetRejection | "BALLOT_SESSION" | "RATE_LIMITED" | "VOIDED" | "INVALID";
export type CastResult =
  | { ok: true; status: "cast" | "changed" | "unchanged"; categoryId: string; nomineeId: string }
  | { ok: false; reason: VoteRejection };

const STATUS: Record<VoteRejection, number> = {
  SIGNED_OUT: 401,
  BALLOT_SESSION: 401,
  UNVERIFIED_EMAIL: 403,
  UNVERIFIED_PHONE: 403,
  INACTIVE: 403,
  BANNED: 403,
  VOIDED: 403,
  RATE_LIMITED: 429,
  NOT_OPEN: 409,
  OUTSIDE_WINDOW: 409,
  CATEGORY_UNAVAILABLE: 404,
  NOMINEE_UNAVAILABLE: 404,
  NOT_VOTABLE: 422,
  WRONG_CATEGORY: 422,
  INVALID: 400,
};
export const httpStatus = (r: VoteRejection) => STATUS[r];

const ID = /^[A-Za-z0-9_-]{8,40}$/;

export async function castVote(input: { userId: string | null; categoryId: unknown; nomineeId: unknown; ballotToken?: string | null; ip: string; ua: string }): Promise<CastResult> {
  const { categoryId, nomineeId } = input;
  if (typeof categoryId !== "string" || typeof nomineeId !== "string" || !ID.test(categoryId) || !ID.test(nomineeId)) return { ok: false, reason: "INVALID" };
  if (!input.userId) return { ok: false, reason: "SIGNED_OUT" };

  const env = getEnv();
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, emailVerified: true, phoneNumberVerified: true, isActive: true, banned: true, banExpires: true } }),
    getSettings(),
  ]);
  const eligible = voteEligibility({
    user: user ? { ...user, phoneNumberVerified: !!user.phoneNumberVerified, banned: !!user.banned } : null,
    requirePhoneVerification: settings.voting.requirePhoneVerificationToVote,
  });
  if (!eligible.ok) return { ok: false, reason: eligible.reason };
  if (!verifyBallotSession(input.ballotToken, input.userId, env.VOTE_HASH_SECRET)) return { ok: false, reason: "BALLOT_SESSION" };

  const ipHash = voteHash(input.ip, env.VOTE_HASH_SECRET);
  const uaHash = voteHash(input.ua.slice(0, 512), env.VOTE_HASH_SECRET);
  const [byMember, byIp] = await Promise.all([hit(`vote:u:${input.userId}`, MEMBER_VOTES_PER_MINUTE, 60), hit(`vote:ip:${ipHash.slice(0, 32)}`, IP_VOTES_PER_MINUTE, 60)]);
  if (!byMember.allowed || !byIp.allowed) return { ok: false, reason: "RATE_LIMITED" };

  return prisma.$transaction(async (tx) => {
    const nominee = await tx.nominee.findUnique({
      where: { id: nomineeId },
      select: {
        categoryId: true,
        status: true,
        category: { select: { id: true, editionId: true, status: true, votingType: true, edition: { select: { status: true, phase: true, votingOpensAt: true, votingClosesAt: true } } } },
      },
    });
    if (!nominee) return { ok: false, reason: "NOMINEE_UNAVAILABLE" } as const;
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
    const target = checkVoteTarget({ edition: nominee.category.edition, category: nominee.category, nominee, requestedCategoryId: categoryId, now: clock!.now });
    if (!target.ok) return { ok: false, reason: target.reason } as const;
    const editionId = nominee.category.editionId;

    // One row per (member, category); racing requests can't create a second one.
    const inserted = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "Vote" ("id", "userId", "editionId", "categoryId", "nomineeId", "ipHash", "uaHash", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${input.userId}, ${editionId}, ${categoryId}, ${nomineeId}, ${ipHash}, ${uaHash}, now(), now())
      ON CONFLICT ("userId", "categoryId") DO NOTHING
      RETURNING "id"`;
    if (inserted.length) {
      await tx.voteEvent.create({ data: { userId: input.userId, editionId, categoryId, toNomineeId: nomineeId, type: "CAST", ipHash, uaHash } });
      return { ok: true, status: "cast", categoryId, nomineeId } as const;
    }

    const [existing] = await tx.$queryRaw<{ id: string; nomineeId: string; voidedAt: Date | null }[]>`
      SELECT "id", "nomineeId", "voidedAt" FROM "Vote" WHERE "userId" = ${input.userId} AND "categoryId" = ${categoryId} FOR UPDATE`;
    if (!existing) return { ok: false, reason: "INVALID" } as const; // deleted concurrently
    if (existing.voidedAt) return { ok: false, reason: "VOIDED" } as const;
    if (existing.nomineeId === nomineeId) return { ok: true, status: "unchanged", categoryId, nomineeId } as const;
    await tx.$executeRaw`UPDATE "Vote" SET "nomineeId" = ${nomineeId}, "ipHash" = ${ipHash}, "uaHash" = ${uaHash}, "updatedAt" = now() WHERE "id" = ${existing.id}`;
    await tx.voteEvent.create({ data: { userId: input.userId, editionId, categoryId, fromNomineeId: existing.nomineeId, toNomineeId: nomineeId, type: "CHANGED", ipHash, uaHash } });
    return { ok: true, status: "changed", categoryId, nomineeId } as const;
  });
}

/** Opening a ballot session: eligible member + Turnstile passed (checked by the caller). */
export async function ballotSessionAllowed(userId: string | null): Promise<{ ok: true } | { ok: false; reason: VoteRejection }> {
  if (!userId) return { ok: false, reason: "SIGNED_OUT" };
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, phoneNumberVerified: true, isActive: true, banned: true, banExpires: true } }),
    getSettings(),
  ]);
  const e = voteEligibility({ user: user ? { ...user, phoneNumberVerified: !!user.phoneNumberVerified, banned: !!user.banned } : null, requirePhoneVerification: settings.voting.requirePhoneVerificationToVote });
  if (!e.ok) return e;
  if (!(await hit(`ballot-open:${userId}`, 10, 10 * 60)).allowed) return { ok: false, reason: "RATE_LIMITED" };
  return { ok: true };
}
