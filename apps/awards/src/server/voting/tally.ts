import "server-only";
import { prisma } from "@/lib/db";
import { decideCategory } from "./decide";

export { canonicalJson, decideCategory, sha256 } from "./decide";
export type { CategoryResult, TallyCategory, TallyNominee } from "./decide";

/**
 * The ONLY place vote counts are read (A-13). Public pages never import this;
 * the result snapshot (Phase 6 lock, dev phase switcher) is built from it.
 */

/** Counts valid (non-voided) votes and decides every published category of an edition. */
export async function computeEditionResults(editionId: string) {
  const [categories, counts] = await Promise.all([
    prisma.awardCategory.findMany({
      where: { editionId, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, votingType: true, publicWeight: true, juryWeight: true, nominees: { where: { status: "PUBLISHED" }, select: { id: true, juryScore: true, sortOrder: true } } },
    }),
    prisma.vote.groupBy({ by: ["nomineeId"], where: { editionId, voidedAt: null }, _count: { _all: true }, _min: { updatedAt: true } }),
  ]);
  const byNominee = new Map(counts.map((c) => [c.nomineeId, c]));
  return categories.map((c) =>
    decideCategory({
      ...c,
      nominees: c.nominees.map((n) => ({ ...n, votes: byNominee.get(n.id)?._count._all ?? 0, firstVoteAt: byNominee.get(n.id)?._min.updatedAt ?? null })),
    }),
  );
}


/** Snapshot payload (what gets locked and hashed). Percentages here are only shown publicly after publication. */
export function snapshotPayload(editionId: string, results: Awaited<ReturnType<typeof computeEditionResults>>, lockedAt: Date) {
  return {
    editionId,
    lockedAt: lockedAt.toISOString(),
    categories: results.map((r) => ({
      id: r.categoryId,
      votingType: r.votingType,
      totalVotes: r.totalVotes,
      winnerId: r.winnerId,
      nominees: r.nominees.map((n) => ({ id: n.id, votes: n.votes, publicShare: n.publicShare, juryScore: n.juryScore, finalScore: n.finalScore })),
    })),
  };
}
