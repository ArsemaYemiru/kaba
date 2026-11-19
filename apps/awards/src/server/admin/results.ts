import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { canonicalJson, computeEditionResults, sha256, snapshotPayload } from "@/server/voting/tally";

/**
 * Results (spec §5.3/§6). Staff-only: live tallies never leave the admin.
 * Lock = immutable snapshot (tallies + scores, SHA-256 of canonical JSON, who/when).
 * Publish = winners from the latest snapshot, replaced by the latest override per category.
 */
export type SnapshotPayload = ReturnType<typeof snapshotPayload>;

/** The latest moment the edition entered VOTING_CLOSED (from the activity log), so a re-closed edition can be locked again. */
async function lastClosedAt(editionId: string): Promise<Date | null> {
  const row = await prisma.activityLog.findFirst({
    where: { entityType: "AwardEdition", entityId: editionId, action: "phase_change", meta: { path: ["to"], equals: "VOTING_CLOSED" } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}

/** The snapshot that counts now: the latest one locked since voting last closed. */
export async function activeSnapshot(editionId: string) {
  const since = await lastClosedAt(editionId);
  return prisma.resultSnapshot.findFirst({
    where: { editionId, ...(since ? { lockedAt: { gte: since } } : {}) },
    orderBy: { lockedAt: "desc" },
    select: { id: true, lockedAt: true, sha256: true, publishedAt: true, payload: true, lockedBy: { select: { name: true, email: true } } },
  });
}

export async function resultsBoard(editionId: string) {
  const edition = await prisma.awardEdition.findUnique({
    where: { id: editionId },
    select: { id: true, year: true, nameEn: true, phase: true, showPublicPercentages: true, isSample: true, votingClosesAt: true },
  });
  if (!edition) return null;
  const [categories, live, snapshot, overrides] = await Promise.all([
    prisma.awardCategory.findMany({
      where: { editionId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        nameEn: true,
        status: true,
        votingType: true,
        publicWeight: true,
        juryWeight: true,
        nominees: { orderBy: { sortOrder: "asc" }, select: { id: true, displayNameEn: true, workTitleEn: true, status: true, juryScore: true, isWinner: true } },
      },
    }),
    computeEditionResults(editionId),
    activeSnapshot(editionId),
    prisma.winnerOverride.findMany({ where: { category: { editionId } }, orderBy: { createdAt: "desc" }, select: { id: true, categoryId: true, nomineeId: true, reason: true, createdAt: true, by: { select: { name: true } } } }),
  ]);
  const liveBy = new Map(live.map((r) => [r.categoryId, r]));
  const locked = snapshot ? (snapshot.payload as SnapshotPayload) : null;
  const lockedBy = new Map((locked?.categories ?? []).map((c) => [c.id, c]));
  const overrideBy = new Map<string, (typeof overrides)[number]>();
  for (const o of overrides) if (!overrideBy.has(o.categoryId)) overrideBy.set(o.categoryId, o);
  return {
    edition,
    snapshot: snapshot ? { id: snapshot.id, lockedAt: snapshot.lockedAt, sha256: snapshot.sha256, publishedAt: snapshot.publishedAt, lockedBy: snapshot.lockedBy?.name ?? snapshot.lockedBy?.email ?? null } : null,
    categories: categories.map((c) => ({ ...c, live: liveBy.get(c.id) ?? null, locked: lockedBy.get(c.id) ?? null, override: overrideBy.get(c.id) ?? null })),
  };
}

export async function lockResults(editionId: string, userId: string): Promise<{ ok: true; sha256: string } | { ok: false; error: string }> {
  const edition = await prisma.awardEdition.findUnique({ where: { id: editionId }, select: { phase: true } });
  if (!edition) return { ok: false, error: "Edition not found." };
  if (edition.phase !== "VOTING_CLOSED") return { ok: false, error: "Close voting before locking the results." };
  if (await activeSnapshot(editionId)) return { ok: false, error: "Results are already locked. Reopen voting (with a reason) to lock again." };
  const lockedAt = new Date();
  const payload = snapshotPayload(editionId, await computeEditionResults(editionId), lockedAt);
  const json = canonicalJson(payload);
  const hash = sha256(json);
  await prisma.resultSnapshot.create({ data: { editionId, lockedAt, lockedById: userId, payload: JSON.parse(json) as Prisma.InputJsonValue, sha256: hash } });
  return { ok: true, sha256: hash };
}

/** Winners to publish: snapshot winner per category, unless an override names someone else. */
export async function winnersToPublish(editionId: string) {
  const snapshot = await activeSnapshot(editionId);
  if (!snapshot) return null;
  const payload = snapshot.payload as SnapshotPayload;
  const overrides = await prisma.winnerOverride.findMany({ where: { category: { editionId } }, orderBy: { createdAt: "desc" }, select: { categoryId: true, nomineeId: true } });
  const latest = new Map<string, string>();
  for (const o of overrides) if (!latest.has(o.categoryId)) latest.set(o.categoryId, o.nomineeId);
  const winners = payload.categories.map((c) => latest.get(c.id) ?? c.winnerId).filter((v): v is string => !!v);
  return { snapshotId: snapshot.id, winners };
}
