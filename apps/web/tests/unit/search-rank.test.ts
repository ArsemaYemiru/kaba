import { describe, expect, it } from "vitest";
import { rank, scoreItem } from "@/lib/search-rank";

const items = [
  { kind: "episode", title: "E2E Episode vs Test", keywords: ["Mulatu Astatke", "Someone"], href: "/episodes/x" },
  { kind: "episode", title: "Solomon Tekalign vs Berhanu Tesfaye", keywords: [], href: "/episodes/y" },
  { kind: "artist", title: "Mulatu Astatke", subtitle: "ሙላቱ አስታጥቄ", keywords: [], href: "/artists/mulatu-astatke" },
  { kind: "artist", title: "Teddy Afro", subtitle: "ቴዲ አፍሮ", keywords: ["Tewodros Kassahun"], href: "/artists/teddy-afro" },
];

describe("search ranking", () => {
  it("ranks a title match above an episode that only lists the person", () => {
    expect(rank(items, "mulatu").map((i) => i.href)).toEqual(["/artists/mulatu-astatke", "/episodes/x"]);
  });
  it("is not fuzzy (no subsequence matches)", () => {
    expect(scoreItem("mulatu", "Solomon Tekalign vs Berhanu Tesfaye")).toBe(0);
  });
  it("requires every term and matches word prefixes", () => {
    expect(rank(items, "ted af").map((i) => i.href)).toEqual(["/artists/teddy-afro"]);
    expect(rank(items, "teddy zzz")).toEqual([]);
  });
  it("finds legal names via keywords and Amharic via subtitle", () => {
    expect(rank(items, "tewodros")[0]?.href).toBe("/artists/teddy-afro");
    expect(rank(items, "ቴዲ")[0]?.href).toBe("/artists/teddy-afro");
  });
  it("returns everything for an empty search", () => {
    expect(rank(items, "  ")).toHaveLength(items.length);
  });
});
