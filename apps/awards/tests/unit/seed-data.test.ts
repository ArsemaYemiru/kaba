import { describe, expect, it } from "vitest";
import { GENRES, honoreesFor, SAMPLE_CITATION } from "../../prisma/seed/edition";
import { artworks } from "../../prisma/seed/artwork";
import { PUBLISHED_ARTISTS } from "../../prisma/seed/artists";

describe("sample edition (A-76)", () => {
  it("has six sample genres with Amharic names", () => {
    expect(GENRES.map((g) => g.nameEn)).toEqual(["Classical", "Ethio-jazz", "Tizita", "Bati", "Afrobeat", "Traditional"]);
    for (const g of GENRES) expect(g.nameAm).toMatch(/\p{Script=Ethiopic}/u);
  });

  it("honors only fictional sample artists (never a real person)", () => {
    const all = GENRES.flatMap(honoreesFor);
    expect(all).toHaveLength(GENRES.reduce((n, g) => n + g.honorees, 0));
    for (const h of all) expect(h.artistName).toMatch(/^Sample Artist \d[A-D]$/);
    const real = new Set(PUBLISHED_ARTISTS.map((a) => a.nameEn));
    for (const h of all) expect(real.has(h.artistName)).toBe(false);
    expect(new Set(all.map((h) => h.slug)).size).toBe(all.length);
    expect(SAMPLE_CITATION).toMatch(/^Sample/);
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
