/**
 * §9.2: synthetic voting history (dev/staging only, all isSample).
 * Deterministic (seeded PRNG) so `db:reset` always produces the same data.
 */

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UAS = [
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; TECNO KI7) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; Infinix X6816) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 Telegram-Android/11.4",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
];

export type PlanVoter = { email: string; name: string; createdAt: Date; ip: string; ua: string };
export type PlanVote = {
  voterEmail: string;
  categoryKey: number; // seed category number
  nominee: number; // index 0–4
  castAt: Date;
  changedFrom?: { nominee: number; at: Date };
};

/** Nominee weights per category (shuffled per category): realistic skew. */
const SKEW = [0.34, 0.24, 0.18, 0.14, 0.1];

function pickWeighted(r: () => number, weights: number[]) {
  let x = r();
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]!;
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

export function planVoting(opts: { votable: number[]; opensAt: Date; now: Date; announcedAt: Date; voters?: number }) {
  const r = rng(2026);
  const voterCount = opts.voters ?? 120;
  const weights = new Map(
    opts.votable.map((c) => {
      const order = [0, 1, 2, 3, 4].sort(() => r() - 0.5);
      const w = new Array(5).fill(0);
      order.forEach((nominee, rank) => (w[nominee] = SKEW[rank]));
      return [c, w as number[]];
    }),
  );
  const span = opts.now.getTime() - 5 * 60_000 - opts.opensAt.getTime();
  const at = (from: number, to: number) => new Date(from + r() * Math.max(1, to - from));

  const voters: PlanVoter[] = [];
  const votes: PlanVote[] = [];
  for (let i = 1; i <= voterCount; i++) {
    const n = String(i).padStart(3, "0");
    // ~1 in 8 voters share a household IP with the previous voter.
    const ip = i > 1 && r() < 0.125 ? voters[voters.length - 1]!.ip : `10.${20 + (i % 200)}.${Math.floor(r() * 250)}.${1 + Math.floor(r() * 250)}`;
    const firstVote = opts.opensAt.getTime() + r() * span;
    const createdAt = at(opts.announcedAt.getTime() - 7 * 86_400_000, Math.min(firstVote, opts.now.getTime()) - 60_000);
    const email = `voter${n}@example.com`;
    voters.push({ email, name: `Sample Voter ${n}`, createdAt, ip, ua: UAS[Math.floor(r() * UAS.length)]! });

    // Each voter votes in 2–8 categories (≈5 on average → ≈600 votes).
    const k = 2 + Math.floor(r() * 7);
    const cats = [...opts.votable].sort(() => r() - 0.5).slice(0, k);
    for (const c of cats) {
      const nominee = pickWeighted(r, weights.get(c)!);
      const castAt = new Date(Math.max(firstVote, createdAt.getTime() + 60_000) + r() * 3 * 3600_000);
      if (castAt >= opts.now) continue;
      // ~8% of votes were changed later.
      if (r() < 0.08) {
        const from = (nominee + 1 + Math.floor(r() * 4)) % 5;
        const changeAt = new Date(castAt.getTime() + r() * Math.max(60_000, opts.now.getTime() - castAt.getTime() - 60_000));
        votes.push({ voterEmail: email, categoryKey: c, nominee, castAt: changeAt, changedFrom: { nominee: from, at: castAt } });
      } else {
        votes.push({ voterEmail: email, categoryKey: c, nominee, castAt });
      }
    }
  }
  return { voters, votes };
}

/**
 * Suspicious cluster: 15 accounts from one IP, created within 10 minutes,
 * all voting for the same nominee (category 1, nominee D) shortly after.
 */
export function planCluster(opts: { now: Date }) {
  const r = rng(1515);
  const start = opts.now.getTime() - 26 * 3600_000;
  const ip = "10.99.99.99";
  const ua = UAS[3]!;
  const voters: PlanVoter[] = [];
  const votes: PlanVote[] = [];
  for (let i = 1; i <= 15; i++) {
    const n = String(i).padStart(2, "0");
    const createdAt = new Date(start + r() * 10 * 60_000);
    const email = `burst${n}@example.com`;
    voters.push({ email, name: `Sample Burst ${n}`, createdAt, ip, ua });
    votes.push({ voterEmail: email, categoryKey: 1, nominee: 3, castAt: new Date(createdAt.getTime() + 60_000 + r() * 5 * 60_000) });
  }
  return { voters, votes, ip };
}
