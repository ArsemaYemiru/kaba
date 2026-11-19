"use server";

import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { invalidate, TAGS_FOR } from "@/lib/revalidate";
import { activeSnapshot, lockResults } from "@/server/admin/results";

type R = { ok: true; message?: string } | { ok: false; error: string };

/** Jury score 0–100 for a JURY/HYBRID nominee; frozen once results are locked. Super admins only. */
export async function setJuryScore(nomineeId: string, score: number | null): Promise<R> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const s = z.number().int().min(0).max(100).nullable().safeParse(score);
  if (!s.success) return { ok: false, error: "Enter a whole number from 0 to 100." };
  const n = await prisma.nominee.findUnique({ where: { id: z.string().min(1).parse(nomineeId) }, select: { displayNameEn: true, juryScore: true, category: { select: { votingType: true, editionId: true, edition: { select: { phase: true } } } } } });
  if (!n) return { ok: false, error: "Nominee not found." };
  if (n.category.votingType !== "JURY" && n.category.votingType !== "HYBRID") return { ok: false, error: "Only jury and public + jury categories take jury scores." };
  if (n.category.edition.phase === "WINNERS_ANNOUNCED" || (await activeSnapshot(n.category.editionId))) return { ok: false, error: "Results are locked; jury scores can't change." };
  await prisma.nominee.update({ where: { id: nomineeId }, data: { juryScore: s.data } });
  await logActivity({ userId: a.user.id, action: "jury_score", entityType: "Nominee", entityId: nomineeId, meta: { label: n.displayNameEn, from: n.juryScore, to: s.data } });
  return { ok: true };
}

export async function lockEditionResults(editionId: string): Promise<R> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const r = await lockResults(z.string().min(1).parse(editionId), a.user.id);
  if (!r.ok) return r;
  await logActivity({ userId: a.user.id, action: "lock_results", entityType: "AwardEdition", entityId: editionId, meta: { sha256: r.sha256 } });
  return { ok: true, message: `Results locked. SHA-256 ${r.sha256.slice(0, 12)}…` };
}

/** Manual winner (after lock, before publishing) with a written reason. Applied when winners are published. */
export async function overrideWinner(input: unknown): Promise<R> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const p = z.object({ categoryId: z.string().min(1), nomineeId: z.string().min(1), reason: z.string().trim().min(10, "Explain the override (at least 10 characters).").max(1000) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid request." };
  const { categoryId, nomineeId, reason } = p.data;
  const cat = await prisma.awardCategory.findUnique({ where: { id: categoryId }, select: { nameEn: true, editionId: true, edition: { select: { phase: true } } } });
  if (!cat) return { ok: false, error: "Category not found." };
  if (cat.edition.phase !== "VOTING_CLOSED" || !(await activeSnapshot(cat.editionId))) return { ok: false, error: "Overrides are possible after results are locked and before winners are published." };
  const nominee = await prisma.nominee.findFirst({ where: { id: nomineeId, categoryId }, select: { displayNameEn: true, workTitleEn: true } });
  if (!nominee) return { ok: false, error: "That nominee isn't in this category." };
  await prisma.winnerOverride.create({ data: { categoryId, nomineeId, reason, byId: a.user.id } });
  await logActivity({ userId: a.user.id, action: "override", entityType: "AwardCategory", entityId: categoryId, meta: { label: cat.nameEn, winner: nominee.workTitleEn ?? nominee.displayNameEn, reason } });
  return { ok: true, message: "Override saved. It applies when winners are published." };
}

/* ───────────── Members & vote monitor (spec §5.4) ───────────── */

const Selector = z
  .object({
    editionId: z.string().min(1),
    userId: z.string().min(1).optional(),
    ipHash: z.string().regex(/^[0-9a-f]{16,64}$/).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    reason: z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000),
  })
  .refine((s) => s.userId || s.ipHash || (s.from && s.to), "Choose a member, an IP hash or a time range.");

async function moderate(kind: "void" | "restore", input: unknown): Promise<R> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const p = Selector.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid request." };
  const s = p.data;
  const edition = await prisma.awardEdition.findUnique({ where: { id: s.editionId }, select: { phase: true, nameEn: true } });
  if (!edition) return { ok: false, error: "Edition not found." };
  if (edition.phase === "WINNERS_ANNOUNCED") return { ok: false, error: "Winners are published; votes in this edition can't change." };
  const where = {
    editionId: s.editionId,
    voidedAt: kind === "void" ? null : { not: null },
    ...(s.userId ? { userId: s.userId } : {}),
    ...(s.ipHash ? { ipHash: s.ipHash } : {}),
    ...(s.from && s.to ? { updatedAt: { gte: new Date(s.from), lt: new Date(s.to) } } : {}),
  };
  const votes = await prisma.vote.findMany({ where, select: { id: true, userId: true, categoryId: true, nomineeId: true, ipHash: true, uaHash: true, isSample: true } });
  if (!votes.length) return { ok: true, message: kind === "void" ? "No counting votes matched." : "No voided votes matched." };
  const now = new Date();
  await prisma.$transaction([
    prisma.vote.updateMany({ where: { id: { in: votes.map((v) => v.id) } }, data: kind === "void" ? { voidedAt: now, voidReason: s.reason, voidedById: a.user.id } : { voidedAt: null, voidReason: null, voidedById: null } }),
    prisma.voteEvent.createMany({
      data: votes.map((v) => ({
        userId: v.userId,
        editionId: s.editionId,
        categoryId: v.categoryId,
        fromNomineeId: kind === "void" ? v.nomineeId : null,
        toNomineeId: kind === "void" ? null : v.nomineeId,
        type: kind === "void" ? ("VOIDED" as const) : ("RESTORED" as const),
        ipHash: v.ipHash,
        uaHash: v.uaHash,
        actorId: a.user.id,
        reason: s.reason,
        isSample: v.isSample,
      })),
    }),
  ]);
  await logActivity({ userId: a.user.id, action: kind === "void" ? "void_votes" : "restore_votes", entityType: s.userId ? "User" : "Vote", entityId: s.userId ?? null, meta: { label: edition.nameEn, count: votes.length, ipHash: s.ipHash ?? null, from: s.from ?? null, to: s.to ?? null, reason: s.reason } });
  return { ok: true, message: `${votes.length} vote${votes.length === 1 ? "" : "s"} ${kind === "void" ? "voided" : "restored"}.` };
}

export async function voidVotes(input: unknown) {
  await authorize("SUPER_ADMIN");
  return moderate("void", input);
}
export async function restoreVotes(input: unknown) {
  await authorize("SUPER_ADMIN");
  return moderate("restore", input);
}

/** Ban: sign the member out everywhere and void their counting votes in editions not yet published. */
export async function banMember(input: unknown): Promise<R> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const p = z.object({ userId: z.string().min(1), reason: z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid request." };
  const u = await prisma.user.findFirst({ where: { id: p.data.userId, role: "MEMBER" }, select: { email: true } });
  if (!u) return { ok: false, error: "Member not found." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: p.data.userId }, data: { banned: true, banReason: p.data.reason } }),
    prisma.session.deleteMany({ where: { userId: p.data.userId } }),
  ]);
  const editions = await prisma.awardEdition.findMany({ where: { phase: { not: "WINNERS_ANNOUNCED" }, votes: { some: { userId: p.data.userId, voidedAt: null } } }, select: { id: true } });
  let voided = 0;
  for (const e of editions) {
    const r = await moderate("void", { editionId: e.id, userId: p.data.userId, reason: `Banned: ${p.data.reason}` });
    if (r.ok && r.message) voided += Number.parseInt(r.message, 10) || 0;
  }
  await logActivity({ userId: a.user.id, action: "ban", entityType: "User", entityId: p.data.userId, meta: { label: u.email, reason: p.data.reason, voided } });
  return { ok: true, message: `Banned. ${voided} vote${voided === 1 ? "" : "s"} voided.` };
}

export async function unbanMember(userId: string): Promise<R> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return { ok: false, error: "Forbidden." };
  const u = await prisma.user.findFirst({ where: { id: z.string().min(1).parse(userId), role: "MEMBER" }, select: { email: true } });
  if (!u) return { ok: false, error: "Member not found." };
  await prisma.user.update({ where: { id: userId }, data: { banned: false, banReason: null, banExpires: null } });
  await logActivity({ userId: a.user.id, action: "unban", entityType: "User", entityId: userId, meta: { label: u.email } });
  return { ok: true, message: "Unbanned. Voided votes stay voided until you restore them." };
}

/** Members' live state changes counts only on the admin side; refresh the public winners only when relevant. */
export async function refreshAwards(): Promise<R> {
  const a = await authorize();
  if (!a.ok) return { ok: false, error: "Forbidden." };
  invalidate(TAGS_FOR.awards());
  return { ok: true };
}
