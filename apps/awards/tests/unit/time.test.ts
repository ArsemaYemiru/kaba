import { describe, expect, it } from "vitest";
import { formatEat, humanizeRemaining, remaining } from "@/lib/time";

describe("EAT time helpers", () => {
  it("formats in Africa/Addis_Ababa (UTC+3)", () => {
    expect(formatEat("2027-03-01T15:00:00Z", "en-GB", { timeStyle: "short" })).toBe("18:00");
    expect(formatEat("2027-03-01T22:30:00Z", "en-GB", { dateStyle: "short" })).toBe("02/03/2027"); // next day in EAT
  });
  it("splits remaining time and never goes negative", () => {
    const now = Date.parse("2027-01-01T00:00:00Z");
    expect(remaining("2027-01-02T01:02:03Z", now)).toMatchObject({ days: 1, hours: 1, minutes: 2, seconds: 3 });
    expect(remaining("2026-12-31T00:00:00Z", now).total).toBe(0);
  });
  it("humanizes", () => {
    const now = Date.parse("2027-01-01T00:00:00Z");
    expect(humanizeRemaining(remaining("2027-01-04T00:00:00Z", now))).toBe("3 days");
    expect(humanizeRemaining(remaining("2027-01-01T01:30:00Z", now))).toBe("1 hour");
    expect(humanizeRemaining(remaining("2027-01-01T00:00:30Z", now))).toBe("less than a minute");
  });
});
