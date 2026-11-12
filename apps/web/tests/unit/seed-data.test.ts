import { describe, expect, it } from "vitest";
import { artworks } from "../../prisma/seed/artwork";
import { DRAFT_CONTESTANTS, FEATURED_ARTISTS, PUBLISHED_ARTISTS } from "../../prisma/seed/artists";
import { EPISODES } from "../../prisma/seed/episodes";
import { VIDEOS } from "../../prisma/seed/videos";
import { slugify } from "@/lib/slug";
import { SiteSettingsSchema } from "@/schemas/settings";

describe("slugify", () => {
  it.each([
    ["Lij Michael vs Hanan Tarik", "lij-michael-vs-hanan-tarik"],
    ["Sehar Abdulkerim performs 'Panda'", "sehar-abdulkerim-performs-panda"],
    ["Lij Michael & Fantu Mandoye on Feta", "lij-michael-fantu-mandoye-on-feta"],
    ["Éthiopiques", "ethiopiques"],
  ])("%s", (input, slug) => expect(slugify(input)).toBe(slug));
});

describe("seed data matches spec §8", () => {
  it("has 13 published artists and 8 draft contestants with unique slugs", () => {
    expect(PUBLISHED_ARTISTS).toHaveLength(13);
    expect(DRAFT_CONTESTANTS).toHaveLength(8);
    const slugs = [...PUBLISHED_ARTISTS.map((a) => a.nameEn), ...DRAFT_CONTESTANTS].map(slugify);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("features exactly the six spec artists, all published", () => {
    const names = PUBLISHED_ARTISTS.map((a) => a.nameEn);
    expect(FEATURED_ARTISTS).toEqual(["Mulatu Astatke", "Aster Aweke", "Teddy Afro", "Betty G", "Rophnan", "Mahmoud Ahmed"]);
    for (const f of FEATURED_ARTISTS) expect(names).toContain(f);
  });
  it("has 16 episodes, one featured, one holiday special", () => {
    expect(EPISODES).toHaveLength(16);
    expect(EPISODES.filter((e) => e.featured).map((e) => `${e.a} vs ${e.b}`)).toEqual(["Lij Michael vs Hanan Tarik"]);
    expect(EPISODES.filter((e) => e.type === "HOLIDAY_SPECIAL")).toHaveLength(1);
  });
  it("only references artists and episodes that exist", () => {
    const people = new Set([...PUBLISHED_ARTISTS.map((a) => a.nameEn), ...DRAFT_CONTESTANTS]);
    const eps = new Set(EPISODES.map((e) => `${e.a} vs ${e.b}`));
    for (const v of VIDEOS) {
      for (const a of v.artists ?? []) expect(people).toContain(a);
      if (v.episode) expect(eps).toContain(v.episode);
    }
  });
  it("generates 12 text-free artworks in 3 albums of 4", () => {
    const arts = artworks();
    expect(arts).toHaveLength(12);
    for (const a of arts) expect(a.svg).not.toMatch(/<text/i);
    const perAlbum = arts.reduce<Record<string, number>>((m, a) => ({ ...m, [a.album]: (m[a.album] ?? 0) + 1 }), {});
    expect(Object.values(perAlbum)).toEqual([4, 4, 4]);
    expect(artworks()[0]!.svg).toBe(arts[0]!.svg); // deterministic
  });
});

describe("SiteSettingsSchema", () => {
  it("rejects a non-URL social link", () => {
    const r = SiteSettingsSchema.shape.social.safeParse({ telegram: "not a url" });
    expect(r.success).toBe(false);
  });
  it("accepts empty strings for unset links", () => {
    expect(SiteSettingsSchema.shape.social.parse({ telegram: "" })).toEqual({ telegram: "" });
  });
});
