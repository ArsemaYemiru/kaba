import { describe, expect, it } from "vitest";
import { BALLOT_TTL_SECONDS, signBallotSession, verifyBallotSession } from "@/server/voting/ballot-session";
import { checkVoteTarget, type VoteTarget } from "@/server/voting/rules";

const now = new Date("2027-02-20T12:00:00Z");
const base: VoteTarget = {
  edition: { status: "PUBLISHED", phase: "VOTING_OPEN", votingOpensAt: new Date("2027-02-15T09:00:00Z"), votingClosesAt: new Date("2027-03-01T15:00:00Z") },
  category: { id: "cat1", status: "PUBLISHED", votingType: "PUBLIC_VOTE" },
  nominee: { categoryId: "cat1", status: "PUBLISHED" },
  requestedCategoryId: "cat1",
  now,
};
type Patch = Partial<Omit<VoteTarget, "edition" | "category" | "nominee">> & { edition?: Partial<VoteTarget["edition"]>; category?: Partial<VoteTarget["category"]>; nominee?: Partial<VoteTarget["nominee"]> };
const check = (patch: Patch) =>
  checkVoteTarget({
    ...base,
    ...patch,
    edition: { ...base.edition, ...patch.edition },
    category: { ...base.category, ...patch.category },
    nominee: { ...base.nominee, ...patch.nominee },
  });

describe("vote target rules (spec §5.2)", () => {
  it("accepts a published nominee in an open public-vote or hybrid category", () => {
    expect(check({})).toEqual({ ok: true });
    expect(check({ category: { votingType: "HYBRID" } })).toEqual({ ok: true });
  });
  it("only while the phase is VOTING_OPEN and the edition is published", () => {
    for (const phase of ["DRAFT", "NOMINEES_ANNOUNCED", "VOTING_CLOSED", "WINNERS_ANNOUNCED"] as const) expect(check({ edition: { phase } })).toEqual({ ok: false, reason: "NOT_OPEN" });
    expect(check({ edition: { status: "DRAFT" } })).toEqual({ ok: false, reason: "NOT_OPEN" });
  });
  it("only inside [votingOpensAt, votingClosesAt), by the clock passed in", () => {
    expect(check({ now: new Date("2027-02-15T08:59:59.999Z") })).toEqual({ ok: false, reason: "OUTSIDE_WINDOW" });
    expect(check({ now: new Date("2027-02-15T09:00:00Z") })).toEqual({ ok: true }); // opening instant counts
    expect(check({ now: new Date("2027-03-01T14:59:59.999Z") })).toEqual({ ok: true });
    expect(check({ now: new Date("2027-03-01T15:00:00Z") })).toEqual({ ok: false, reason: "OUTSIDE_WINDOW" }); // closing instant doesn't
    expect(check({ edition: { votingClosesAt: null } })).toEqual({ ok: false, reason: "OUTSIDE_WINDOW" });
  });
  it("rejects jury and honorary categories", () => {
    expect(check({ category: { votingType: "JURY" } })).toEqual({ ok: false, reason: "NOT_VOTABLE" });
    expect(check({ category: { votingType: "HONORARY" } })).toEqual({ ok: false, reason: "NOT_VOTABLE" });
  });
  it("rejects a nominee from another category", () => {
    expect(check({ nominee: { categoryId: "cat2" } })).toEqual({ ok: false, reason: "WRONG_CATEGORY" });
    expect(check({ requestedCategoryId: "cat2" })).toEqual({ ok: false, reason: "WRONG_CATEGORY" });
  });
  it("rejects unpublished nominees and categories", () => {
    expect(check({ nominee: { status: "DRAFT" } })).toEqual({ ok: false, reason: "NOMINEE_UNAVAILABLE" });
    expect(check({ nominee: { status: "ARCHIVED" } })).toEqual({ ok: false, reason: "NOMINEE_UNAVAILABLE" });
    expect(check({ category: { status: "DRAFT" } })).toEqual({ ok: false, reason: "CATEGORY_UNAVAILABLE" });
  });
});

describe("ballot session (spec §5.2)", () => {
  const secret = "x".repeat(40);
  it("is valid for the same member for 30 minutes", () => {
    const t0 = Date.parse("2027-02-20T12:00:00Z");
    const token = signBallotSession("user_1", secret, t0);
    expect(verifyBallotSession(token, "user_1", secret, t0 + 1000)).toBe(true);
    expect(verifyBallotSession(token, "user_1", secret, t0 + BALLOT_TTL_SECONDS * 1000 - 1)).toBe(true);
    expect(verifyBallotSession(token, "user_1", secret, t0 + BALLOT_TTL_SECONDS * 1000)).toBe(false);
  });
  it("is bound to the member, signed, and rejects tampering", () => {
    const token = signBallotSession("user_1", secret);
    expect(verifyBallotSession(token, "user_2", secret)).toBe(false);
    expect(verifyBallotSession(token, "user_1", "y".repeat(40))).toBe(false);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "user_2", e: Date.now() + 1e9 })).toString("base64url");
    expect(verifyBallotSession(`${forged}.${sig}`, "user_2", secret)).toBe(false);
    expect(verifyBallotSession(`${payload}.`, "user_1", secret)).toBe(false);
    expect(verifyBallotSession(undefined, "user_1", secret)).toBe(false);
  });
});
