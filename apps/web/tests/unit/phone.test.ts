import { describe, expect, it } from "vitest";
import { normalizeEthiopianPhone } from "@/lib/phone";

describe("normalizeEthiopianPhone (spec §4.8)", () => {
  it.each([
    ["+251911234567", "+251911234567"],
    ["+251711234567", "+251711234567"],
    ["0911234567", "+251911234567"],
    ["0711234567", "+251711234567"],
    ["0911 23 45 67", "+251911234567"],
    ["+251-911-234-567", "+251911234567"],
  ])("%s → %s", (input, out) => expect(normalizeEthiopianPhone(input)).toBe(out));

  it.each(["", "12345", "0811234567", "+251811234567", "091123456", "09112345678", "251911234567", "+2519112345678"])("rejects %j", (input) => {
    expect(normalizeEthiopianPhone(input)).toBeNull();
  });
});
