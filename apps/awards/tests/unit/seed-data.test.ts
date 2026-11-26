import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatYearsActive } from "@/lib/years";
import { CategorySchema, EditionSchema, HonoreeSchema } from "@/schemas/admin/awards";
import { AlbumSchema, ArtistSchema, NewsSchema } from "@/schemas/admin/content";
import { NEWS } from "../../prisma/seed/content";
import { ALBUMS, ARTISTS, EDITION, GENRES, SHOWCASE_NEWS } from "../../prisma/seed/showcase";

const seed = readFileSync(path.resolve(__dirname, "../../prisma/seed.ts"), "utf8");

describe("seed", () => {
  it("creates no media or videos (photos are added in the admin)", () => {
    for (const model of ["media", "video"]) expect(seed, model).not.toMatch(new RegExp(`\\.${model}\\.(create|upsert)`));
  });

  it("ships only the published welcome post in the base content", () => {
    expect(NEWS.map((n) => n.status)).toEqual(["PUBLISHED"]);
    expect(JSON.stringify(NEWS)).not.toMatch(/sample/i);
  });

  it("seeds the showcase only once, inside a transaction", () => {
    expect(seed).toMatch(/prisma\.artist\.count\(\{ where: \{ slug: \{ in: slugs \} \} \}\)/);
    expect(seed).toMatch(/prisma\.\$transaction\(\s*async \(tx\)/);
  });
});

describe("showcase content passes the admin forms", () => {
  it("artists", () => {
    for (const a of ARTISTS) {
      const r = ArtistSchema.safeParse({ ...a, galleryIds: [], videoIds: [], socialLinks: [] });
      expect(r.success, `${a.slug}: ${r.error?.message}`).toBe(true);
    }
    expect(new Set(ARTISTS.map((a) => a.slug)).size).toBe(ARTISTS.length);
  });

  it("years active never reads '–present'", () => {
    for (const a of ARTISTS) expect(formatYearsActive(a.yearsActive) ?? "", a.slug).not.toMatch(/present/i);
  });

  it("edition, genres and honorees", () => {
    expect(EditionSchema.safeParse(EDITION).success).toBe(true);
    const slugs = new Set(ARTISTS.map((a) => a.slug));
    for (const g of GENRES) {
      const c = CategorySchema.safeParse({ ...g, editionId: "e", status: "PUBLISHED" });
      expect(c.success, `${g.slug}: ${c.error?.message}`).toBe(true);
      expect(new Set(g.honorees.map((h) => h.artist)).size, g.slug).toBe(g.honorees.length);
      for (const h of g.honorees) {
        expect(slugs.has(h.artist), h.artist).toBe(true);
        expect(ARTISTS.find((a) => a.slug === h.artist)!.status, `${h.artist} must be published to be honored`).toBe("PUBLISHED");
        const r = HonoreeSchema.safeParse({ ...h, categoryId: "c", artistId: "a", slug: `${EDITION.year}-${g.slug}-${h.artist}`, status: "PUBLISHED" });
        expect(r.success, `${h.artist}: ${r.error?.message}`).toBe(true);
      }
    }
  });

  it("albums and news", () => {
    for (const al of ALBUMS) expect(AlbumSchema.safeParse({ ...al, editionId: null, items: [] }).success, al.slug).toBe(true);
    for (const n of SHOWCASE_NEWS) {
      const r = NewsSchema.safeParse({ ...n, titleEn: n.title, excerptEn: n.excerpt, bodyEn: n.body, status: "PUBLISHED" });
      expect(r.success, `${n.slug}: ${r.error?.message}`).toBe(true);
    }
  });
});
