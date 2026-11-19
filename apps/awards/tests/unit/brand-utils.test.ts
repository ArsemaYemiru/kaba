import { describe, expect, it } from "vitest";
import { gradientFor, hashString, initialsFor } from "@/lib/gradient";
import { formatLifespan, formatYearsActive } from "@/lib/years";

describe("gradientFor", () => {
  it("is deterministic and case-insensitive", () => {
    expect(gradientFor("Lij Michael")).toEqual(gradientFor("lij michael "));
    expect(hashString("a")).toBe(hashString("a"));
  });
  it("differs between names", () => {
    expect(gradientFor("Hanan Tarik").css).not.toBe(gradientFor("Lij Michael").css);
  });
});

describe("initialsFor", () => {
  it.each([
    ["Lij Michael", "LM"],
    ["Mulatu Astatke", "MA"],
    ["Root", "RO"],
    ["Traffic Police", "TP"],
    ["ጂጂ", "ጂ"],
    ["  ", "?"],
  ])("%s → %s", (name, expected) => {
    expect(initialsFor(name)).toBe(expected);
  });
});

describe("formatLifespan", () => {
  it("formats per spec", () => {
    expect(formatLifespan(1940, 2009)).toBe("1940–2009");
    expect(formatLifespan(1943, null)).toBe("b. 1943");
    expect(formatLifespan(null, null)).toBeNull();
  });
  it("never says present", () => {
    expect(formatLifespan(1976)).not.toMatch(/present/i);
  });
});

describe("formatYearsActive", () => {
  it("turns a start year into 'Active since'", () => {
    expect(formatYearsActive("2012")).toBe("Active since 2012");
    expect(formatYearsActive("2012–present")).toBe("Active since 2012");
    expect(formatYearsActive("1965–1990")).toBe("1965–1990");
    expect(formatYearsActive("")).toBeNull();
  });
});
