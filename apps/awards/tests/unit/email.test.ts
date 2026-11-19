import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/email";

describe("normalizeEmail (one inbox, one account)", () => {
  it.each([
    ["  Abebe@Example.com ", "abebe@example.com"],
    ["a.b.e.b.e@gmail.com", "abebe@gmail.com"],
    ["Abebe+feta@Gmail.com", "abebe@gmail.com"],
    ["abebe@googlemail.com", "abebe@gmail.com"],
    ["a.bebe+x@yahoo.com", "a.bebe+x@yahoo.com"], // dots/tags only stripped for Gmail
  ])("%s → %s", (input, out) => expect(normalizeEmail(input)).toBe(out));
});
