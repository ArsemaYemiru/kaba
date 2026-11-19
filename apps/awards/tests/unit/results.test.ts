import { describe, expect, it } from "vitest";
import { canonicalJson, decideCategory, sha256, type TallyNominee } from "@/server/voting/decide";

const n = (id: string, votes: number, juryScore: number | null = null, first = 0, sortOrder = 0): TallyNominee => ({
  id,
  votes,
  juryScore,
  firstVoteAt: votes ? new Date(Date.UTC(2027, 0, 1, 0, first)) : null,
  sortOrder,
});

describe("decideCategory (spec §5.3)", () => {
  it("public vote: largest share wins", () => {
    const r = decideCategory({ id: "c", votingType: "PUBLIC_VOTE", publicWeight: 100, juryWeight: 0, nominees: [n("a", 30), n("b", 50), n("c", 20)] });
    expect(r.winnerId).toBe("b");
    expect(r.totalVotes).toBe(100);
    expect(r.nominees[0]).toMatchObject({ id: "b", publicShare: 0.5 });
  });
  it("public vote with no votes has no winner", () => {
    expect(decideCategory({ id: "c", votingType: "PUBLIC_VOTE", publicWeight: 100, juryWeight: 0, nominees: [n("a", 0), n("b", 0)] }).winnerId).toBeNull();
  });
  it("jury: highest jury score wins regardless of votes", () => {
    const r = decideCategory({ id: "c", votingType: "JURY", publicWeight: 0, juryWeight: 100, nominees: [n("a", 90, 70), n("b", 10, 85)] });
    expect(r.winnerId).toBe("b");
  });
  it("hybrid: weighted combination of public share and jury score", () => {
    // a: 60% public, jury 50 → 0.6*60 + 0.4*50 = 56; b: 40% public, jury 80 → 0.6*40 + 0.4*80 = 56 → tie → higher jury (b)
    const r = decideCategory({ id: "c", votingType: "HYBRID", publicWeight: 60, juryWeight: 40, nominees: [n("a", 60, 50), n("b", 40, 80)] });
    expect(r.nominees.map((x) => x.finalScore)).toEqual([56, 56]);
    expect(r.winnerId).toBe("b");
  });
  it("ties on score and jury go to the earliest first vote", () => {
    const r = decideCategory({ id: "c", votingType: "PUBLIC_VOTE", publicWeight: 100, juryWeight: 0, nominees: [n("a", 10, null, 5), n("b", 10, null, 1)] });
    expect(r.winnerId).toBe("b");
  });
  it("honorary: the single recipient", () => {
    expect(decideCategory({ id: "c", votingType: "HONORARY", publicWeight: 0, juryWeight: 0, nominees: [n("h", 0)] }).winnerId).toBe("h");
  });
});

describe("snapshot hashing", () => {
  it("canonical JSON is key-order independent", () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }));
    expect(sha256(canonicalJson({ b: 1, a: 2 }))).toBe(sha256(canonicalJson({ a: 2, b: 1 })));
  });
});
