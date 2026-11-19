import "server-only";
import type { EditionPhase } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { canonicalJson, computeEditionResults, sha256, snapshotPayload } from "@/server/voting/tally";

const DAY = 86_400_000;

/** Milestones relative to now (days) so every phase looks realistic. */
const PLAN: Record<EditionPhase, [announced: number, opens: number, closes: number, ceremony: number]> = {
  DRAFT: [7, 14, 28, 35],
  NOMINEES_ANNOUNCED: [-3, 4, 18, 25],
  VOTING_OPEN: [-10, -3, 14, 21],
  VOTING_CLOSED: [-24, -17, -1, 6],
  WINNERS_ANNOUNCED: [-30, -23, -7, -1],
};

/**
 * Dev only: moves the SAMPLE edition to `phase`. Entering WINNERS_ANNOUNCED
 * computes winners from the seeded votes and publishes a locked snapshot;
 * leaving it clears winners and the dev snapshots. Real editions are refused.
 */
export async function setSamplePhase(phase: EditionPhase, now = new Date()) {
  const edition = await prisma.awardEdition.findFirst({ where: { isSample: true }, orderBy: { year: "desc" }, select: { id: true, slug: true } });
  if (!edition) throw new Error("No sample edition. Run the dev seed first.");
  const [a, o, c, cer] = PLAN[phase].map((d) => new Date(now.getTime() + d * DAY)) as [Date, Date, Date, Date];
  const winners = phase === "WINNERS_ANNOUNCED";
  const results = winners ? await computeEditionResults(edition.id) : [];
  const payload = snapshotPayload(edition.id, results, now);

  await prisma.$transaction(async (tx) => {
    await tx.awardEdition.update({
      where: { id: edition.id },
      data: { phase, nomineesAnnouncedAt: a, votingOpensAt: o, votingClosesAt: c, ceremonyAt: cer, showPublicPercentages: winners },
    });
    await tx.nominee.updateMany({ where: { category: { editionId: edition.id } }, data: { isWinner: false } });
    await tx.resultSnapshot.deleteMany({ where: { editionId: edition.id } });
    if (winners) {
      const ids = results.map((r) => r.winnerId).filter((v): v is string => !!v);
      await tx.nominee.updateMany({ where: { id: { in: ids } }, data: { isWinner: true } });
      const json = canonicalJson(payload);
      await tx.resultSnapshot.create({ data: { editionId: edition.id, lockedAt: now, payload: JSON.parse(json), sha256: sha256(json), publishedAt: now } });
    }
  });
  return edition;
}
