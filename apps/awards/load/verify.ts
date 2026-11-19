/** After k6: zero duplicate votes and an audit trail that matches (spec §11). Throwaway DB only. */
import "../prisma/seed/load-env";
import { prisma } from "../src/lib/db";

async function main() {
  if (!/feta_awards_load/.test(process.env.DATABASE_URL ?? "")) throw new Error("Refusing to run outside feta_awards_load.");
  const [dupes] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM (SELECT "userId", "categoryId" FROM "Vote" WHERE "userId" IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1) d`;
  const [stats] = await prisma.$queryRaw<{ votes: number; pairs: number; casts: number; changes: number; members: number }[]>`
    SELECT
      (SELECT count(*)::int FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email LIKE 'load+%') AS votes,
      (SELECT count(DISTINCT (v."userId", v."categoryId"))::int FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email LIKE 'load+%') AS pairs,
      (SELECT count(*)::int FROM "VoteEvent" e JOIN "user" u ON u.id = e."userId" WHERE u.email LIKE 'load+%' AND e.type = 'CAST') AS casts,
      (SELECT count(*)::int FROM "VoteEvent" e JOIN "user" u ON u.id = e."userId" WHERE u.email LIKE 'load+%' AND e.type = 'CHANGED') AS changes,
      (SELECT count(DISTINCT v."userId")::int FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email LIKE 'load+%') AS members`;
  // Every vote row has exactly one CAST event; the latest event per (member, category) points at the stored nominee.
  const [mismatch] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "Vote" v
    JOIN "user" u ON u.id = v."userId" AND u.email LIKE 'load+%'
    JOIN LATERAL (SELECT e."toNomineeId" FROM "VoteEvent" e WHERE e."userId" = v."userId" AND e."categoryId" = v."categoryId" ORDER BY e."createdAt" DESC, e.id DESC LIMIT 1) last ON true
    WHERE last."toNomineeId" <> v."nomineeId"`;
  const result = { duplicateVotes: dupes!.n, ...stats!, castEventsMatchVotes: stats!.casts === stats!.votes, latestEventMismatches: mismatch!.n };
  console.info(JSON.stringify(result, null, 2));
  if (result.duplicateVotes !== 0 || result.votes !== result.pairs || !result.castEventsMatchVotes) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
