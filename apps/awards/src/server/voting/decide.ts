import { createHash } from "node:crypto";
import type { VotingType } from "@/generated/prisma/enums";

/** Pure result logic (no DB), shared by the tally and unit tests. */
export type TallyNominee = { id: string; votes: number; juryScore: number | null; firstVoteAt: Date | null; sortOrder: number };
export type TallyCategory = { id: string; votingType: VotingType; publicWeight: number; juryWeight: number; nominees: TallyNominee[] };
export type CategoryResult = {
  categoryId: string;
  votingType: VotingType;
  totalVotes: number;
  winnerId: string | null;
  nominees: { id: string; votes: number; publicShare: number; juryScore: number | null; finalScore: number }[];
};

/**
 * Decides one category (spec §5.3):
 * PUBLIC_VOTE = vote share; JURY = jury score; HYBRID = share×publicWeight +
 * jury×juryWeight (both on 0–100); HONORARY = the single recipient.
 * Ties: higher jury score, then earliest first vote, then sort order (A-17).
 */
export function decideCategory(c: TallyCategory): CategoryResult {
  const totalVotes = c.nominees.reduce((s, n) => s + n.votes, 0);
  const rows = c.nominees.map((n) => {
    const publicShare = totalVotes ? n.votes / totalVotes : 0;
    const jury = n.juryScore ?? 0;
    const finalScore =
      c.votingType === "PUBLIC_VOTE"
        ? publicShare * 100
        : c.votingType === "JURY"
          ? jury
          : c.votingType === "HYBRID"
            ? (publicShare * 100 * c.publicWeight + jury * c.juryWeight) / 100
            : 0;
    return { ...n, publicShare, finalScore };
  });
  const ranked = [...rows].sort(
    (a, b) =>
      b.finalScore - a.finalScore ||
      (b.juryScore ?? -1) - (a.juryScore ?? -1) ||
      (a.firstVoteAt?.getTime() ?? Infinity) - (b.firstVoteAt?.getTime() ?? Infinity) ||
      a.sortOrder - b.sortOrder,
  );
  const winnerId =
    c.votingType === "HONORARY" ? (c.nominees.length === 1 ? c.nominees[0]!.id : null) : c.votingType === "PUBLIC_VOTE" && totalVotes === 0 ? null : (ranked[0]?.id ?? null);
  return {
    categoryId: c.id,
    votingType: c.votingType,
    totalVotes,
    winnerId,
    nominees: ranked.map((n) => ({ id: n.id, votes: n.votes, publicShare: Math.round(n.publicShare * 10000) / 10000, juryScore: n.juryScore, finalScore: Math.round(n.finalScore * 100) / 100 })),
  };
}

/** Stable JSON (sorted keys) and its SHA-256, for tamper-evident snapshots. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object" && !(value instanceof Date))
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
