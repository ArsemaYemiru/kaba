import "server-only";
import { prisma } from "@/lib/db";

/**
 * Vote monitor (spec §5.4). Staff only. IPs are only ever HMAC hashes.
 * "Accounts" per IP hash = distinct members whose vote events came from it.
 */
export const SUSPICIOUS_ACCOUNTS_PER_IP = 5;

export async function monitorEdition() {
  return prisma.awardEdition.findFirst({ where: { phase: { in: ["VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"] } }, orderBy: { year: "desc" }, select: { id: true, nameEn: true, phase: true } });
}

export async function votesPerHour(editionId: string, hours = 72) {
  return prisma.$queryRaw<{ hour: Date; votes: number; changes: number }[]>`
    SELECT date_trunc('hour', "createdAt") AS hour,
           count(*) FILTER (WHERE type = 'CAST')::int AS votes,
           count(*) FILTER (WHERE type = 'CHANGED')::int AS changes
    FROM "VoteEvent" WHERE "editionId" = ${editionId} AND "createdAt" > now() - make_interval(hours => ${hours})
    GROUP BY 1 ORDER BY 1`;
}

export async function signupsPerHour(hours = 72) {
  return prisma.$queryRaw<{ hour: Date; signups: number }[]>`
    SELECT date_trunc('hour', "createdAt") AS hour, count(*)::int AS signups
    FROM "user" WHERE role = 'MEMBER' AND "createdAt" > now() - make_interval(hours => ${hours})
    GROUP BY 1 ORDER BY 1`;
}

export async function topIpHashes(editionId: string, limit = 15) {
  return prisma.$queryRaw<{ ipHash: string; accounts: number; votes: number; voided: number; lastAt: Date }[]>`
    SELECT e."ipHash",
           count(DISTINCT e."userId")::int AS accounts,
           count(*) FILTER (WHERE e.type = 'CAST')::int AS votes,
           (SELECT count(*)::int FROM "Vote" v WHERE v."ipHash" = e."ipHash" AND v."editionId" = ${editionId} AND v."voidedAt" IS NOT NULL) AS voided,
           max(e."createdAt") AS "lastAt"
    FROM "VoteEvent" e WHERE e."editionId" = ${editionId} AND e.type IN ('CAST', 'CHANGED')
    GROUP BY e."ipHash" ORDER BY accounts DESC, votes DESC LIMIT ${limit}`;
}

/** Accounts created in bursts: ≥ `min` sign-ups in the same 10-minute window that later voted from one IP hash. */
export async function signupBursts(editionId: string, min = 8) {
  return prisma.$queryRaw<{ windowStart: Date; ipHash: string; accounts: number; votes: number }[]>`
    WITH first_vote AS (
      SELECT DISTINCT ON (e."userId") e."userId", e."ipHash" FROM "VoteEvent" e
      WHERE e."editionId" = ${editionId} AND e."userId" IS NOT NULL ORDER BY e."userId", e."createdAt"
    )
    SELECT to_timestamp(floor(extract(epoch FROM u."createdAt") / 600) * 600) AS "windowStart", f."ipHash",
           count(DISTINCT u.id)::int AS accounts,
           (SELECT count(*)::int FROM "Vote" v WHERE v."userId" = ANY(array_agg(u.id)) AND v."editionId" = ${editionId}) AS votes
    FROM "user" u JOIN first_vote f ON f."userId" = u.id
    GROUP BY 1, 2 HAVING count(DISTINCT u.id) >= ${min}
    ORDER BY accounts DESC, "windowStart" DESC LIMIT 20`;
}

export async function frequentChangers(editionId: string, min = 5) {
  return prisma.$queryRaw<{ userId: string; email: string; changes: number }[]>`
    SELECT e."userId", u.email, count(*)::int AS changes
    FROM "VoteEvent" e JOIN "user" u ON u.id = e."userId"
    WHERE e."editionId" = ${editionId} AND e.type = 'CHANGED'
    GROUP BY 1, 2 HAVING count(*) >= ${min} ORDER BY changes DESC LIMIT 20`;
}

/** Sidebar badge: IP hashes shared by many voting accounts with votes still counting. */
export async function monitorAlertCount(): Promise<number> {
  const edition = await monitorEdition().catch(() => null);
  if (!edition) return 0;
  const [row] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM (
      SELECT v."ipHash" FROM "Vote" v WHERE v."editionId" = ${edition.id} AND v."voidedAt" IS NULL AND v."userId" IS NOT NULL
      GROUP BY v."ipHash" HAVING count(DISTINCT v."userId") >= ${SUSPICIOUS_ACCOUNTS_PER_IP}
    ) s`;
  return row?.n ?? 0;
}
