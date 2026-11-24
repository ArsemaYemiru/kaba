import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NEWS } from "../../prisma/seed/content";

const seed = readFileSync(path.resolve(__dirname, "../../prisma/seed.ts"), "utf8");

describe("seed (A-81: staff, welcome post and settings only)", () => {
  it("creates no artists, media, editions, honorees, albums or videos", () => {
    for (const model of ["artist", "media", "awardEdition", "awardCategory", "nominee", "album", "video"]) {
      expect(seed, model).not.toMatch(new RegExp(`prisma\\.${model}\\.(create|upsert)`));
    }
  });

  it("ships only the published welcome post", () => {
    expect(NEWS.map((n) => n.status)).toEqual(["PUBLISHED"]);
    expect(JSON.stringify(NEWS)).not.toMatch(/sample/i);
  });
});
