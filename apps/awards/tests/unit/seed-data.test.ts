import { describe, expect, it } from "vitest";
import { CATEGORIES, nomineesFor, VOTABLE } from "../../prisma/seed/edition";
import { planCluster, planVoting } from "../../prisma/seed/members";
import { artworks } from "../../prisma/seed/artwork";
import { PUBLISHED_ARTISTS } from "../../prisma/seed/artists";

describe("sample edition (spec §9.4)", () => {
  it("has the 12 spec categories with matching voting types", () => {
    expect(CATEGORIES.map((c) => [c.nameEn, c.votingType])).toEqual([
      ["Best Male Artist", "PUBLIC_VOTE"], ["Best Female Artist", "PUBLIC_VOTE"], ["Song of the Year", "PUBLIC_VOTE"],
      ["Album of the Year", "HYBRID"], ["Music Video of the Year", "PUBLIC_VOTE"], ["Best New Artist", "PUBLIC_VOTE"],
      ["Best Actor", "HYBRID"], ["Best Actress", "HYBRID"], ["Film of the Year", "JURY"],
      ["Comedian of the Year", "PUBLIC_VOTE"], ["Content Creator of the Year", "PUBLIC_VOTE"], ["Lifetime Achievement", "HONORARY"],
    ]);
    for (const c of CATEGORIES) expect(c.publicWeight + c.juryWeight).toBe(100);
    for (const c of CATEGORIES) expect(c.nameAm).toMatch(/\p{Script=Ethiopic}/u);
  });

  it("names every nominee by the Sample pattern (never a real person)", () => {
    const all = CATEGORIES.flatMap(nomineesFor);
    expect(all).toHaveLength(11 * 5 + 1);
    for (const n of all) expect(n.displayNameEn).toMatch(/^Sample (Nominee|Artist|Studio) \d+[A-E]$|^Sample Honoree$/);
    expect(nomineesFor(CATEGORIES[2]!)[0]).toMatchObject({ displayNameEn: "Sample Artist 3A", workTitleEn: "Sample Song 3A" });
    expect(new Set(all.map((n) => n.slug)).size).toBe(all.length);
  });

  it("gives jury scores only to hybrid and jury categories", () => {
    for (const c of CATEGORIES) {
      const juried = c.votingType === "HYBRID" || c.votingType === "JURY";
      for (const n of nomineesFor(c)) expect(n.juryScore !== null).toBe(juried);
    }
  });

  it("only public-vote and hybrid categories are votable", () => {
    expect(VOTABLE.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 11]);
  });
});

describe("synthetic voting (spec §9.2)", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  const opensAt = new Date(now.getTime() - 3 * 86_400_000);
  const plan = planVoting({ votable: VOTABLE.map((c) => c.n), opensAt, now, announcedAt: new Date(now.getTime() - 10 * 86_400_000) });

  it("is deterministic and ≈600 votes from 120 voters", () => {
    const again = planVoting({ votable: VOTABLE.map((c) => c.n), opensAt, now, announcedAt: new Date(now.getTime() - 10 * 86_400_000) });
    expect(again.votes.length).toBe(plan.votes.length);
    expect(plan.voters).toHaveLength(120);
    expect(plan.votes.length).toBeGreaterThan(520);
    expect(plan.votes.length).toBeLessThan(680);
  });

  it("never gives a voter two votes in one category, and stays inside the window", () => {
    const keys = plan.votes.map((v) => `${v.voterEmail}:${v.categoryKey}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const v of plan.votes) {
      expect(v.castAt.getTime()).toBeGreaterThanOrEqual(opensAt.getTime());
      expect(v.castAt.getTime()).toBeLessThan(now.getTime());
    }
  });

  it("burst cluster: 15 accounts, one IP, created within 10 minutes, same nominee", () => {
    const c = planCluster({ now });
    expect(c.voters).toHaveLength(15);
    expect(new Set(c.voters.map((v) => v.ip)).size).toBe(1);
    const times = c.voters.map((v) => v.createdAt.getTime());
    expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(10 * 60_000);
    expect(new Set(c.votes.map((v) => `${v.categoryKey}:${v.nominee}`)).size).toBe(1);
  });
});

describe("artists and artwork", () => {
  it("13 published artists, none named like sample data", () => {
    expect(PUBLISHED_ARTISTS).toHaveLength(13);
    for (const a of PUBLISHED_ARTISTS) expect(a.nameEn).not.toMatch(/^Sample/);
  });
  it("12 text-free artworks in Red Carpet / Awards Night / Backstage", () => {
    const arts = artworks();
    expect(arts).toHaveLength(12);
    for (const a of arts) expect(a.svg).not.toMatch(/<text/i);
    expect([...new Set(arts.map((a) => a.album))]).toEqual(["red-carpet", "awards-night", "backstage"]);
  });
});
