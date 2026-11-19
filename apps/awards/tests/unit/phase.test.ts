import { describe, expect, it } from "vitest";
import { checkPhaseChange, type PhaseCheck } from "@/server/admin/phase";

const base: PhaseCheck = { from: "DRAFT", to: "NOMINEES_ANNOUNCED", votingOpensAt: new Date("2027-02-15T09:00Z"), votingClosesAt: new Date("2027-03-01T15:00Z"), hasLockedSnapshot: false, publishedCategories: 12 };

describe("edition phase machine (spec §6, A-16)", () => {
  it("moves forward one step at a time", () => {
    expect(checkPhaseChange(base)).toEqual({ ok: true, direction: "forward" });
    expect(checkPhaseChange({ ...base, to: "VOTING_OPEN" })).toMatchObject({ ok: false });
    expect(checkPhaseChange({ ...base, from: "VOTING_OPEN", to: "WINNERS_ANNOUNCED" })).toMatchObject({ ok: false });
  });
  it("goes back one step only with a reason", () => {
    expect(checkPhaseChange({ ...base, from: "VOTING_CLOSED", to: "VOTING_OPEN" })).toMatchObject({ ok: false });
    expect(checkPhaseChange({ ...base, from: "VOTING_CLOSED", to: "VOTING_OPEN", reason: "Closed by mistake" })).toEqual({ ok: true, direction: "back" });
  });
  it("needs both voting dates, in order, to open voting", () => {
    const open = { ...base, from: "NOMINEES_ANNOUNCED" as const, to: "VOTING_OPEN" as const };
    expect(checkPhaseChange(open)).toEqual({ ok: true, direction: "forward" });
    expect(checkPhaseChange({ ...open, votingClosesAt: null })).toMatchObject({ ok: false });
    expect(checkPhaseChange({ ...open, votingClosesAt: open.votingOpensAt })).toMatchObject({ ok: false });
  });
  it("needs locked results to publish winners, and published categories to announce", () => {
    expect(checkPhaseChange({ ...base, from: "VOTING_CLOSED", to: "WINNERS_ANNOUNCED" })).toMatchObject({ ok: false });
    expect(checkPhaseChange({ ...base, from: "VOTING_CLOSED", to: "WINNERS_ANNOUNCED", hasLockedSnapshot: true })).toEqual({ ok: true, direction: "forward" });
    expect(checkPhaseChange({ ...base, publishedCategories: 0 })).toMatchObject({ ok: false });
  });
});
