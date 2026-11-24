import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "./staff";

/**
 * Throwaway public content for the e2e suite (A-81: the seed creates no
 * artists, photos or editions any more). Created by fixture.setup.ts before
 * every project and removed by fixture.teardown.ts; every slug starts with
 * "e2e-" and the edition is 2097, so real content is never touched.
 */
export const FX = {
  year: "2097",
  genre: { slug: "e2e-music", name: "E2E Music" },
  honorees: [
    { slug: "e2e-honoree-one", name: "E2E Honoree One", citation: "Recognized for the e2e suite.", work: "E2E Song" },
    { slug: "e2e-honoree-two", name: "E2E Honoree Two", citation: null, work: null },
    { slug: "e2e-honoree-three", name: "E2E Honoree Three", citation: null, work: null },
  ],
  legend: { slug: "e2e-legend", name: "E2E Legend" },
  album: { slug: "e2e-album", title: "E2E Album", alt: "E2E stage photo" },
} as const;

export const honoreeSlug = (artistSlug: string) => `${artistSlug}-${FX.genre.slug}-${FX.year}`;
export const GENRE_URL = `/awards/${FX.year}/${FX.genre.slug}`;
export const HONOREE_URL = `/honorees/${honoreeSlug(FX.honorees[0].slug)}`;

const STORAGE = path.resolve(__dirname, "../..", process.env.LOCAL_STORAGE_DIR ?? "storage");
const KEY_DIR = "e2e-fixture";

async function image(key: string, hue: number) {
  const buf = await sharp({ create: { width: 800, height: 1000, channels: 3, background: { r: hue, g: 120, b: 40 } } }).webp().toBuffer();
  await mkdir(path.join(STORAGE, KEY_DIR), { recursive: true });
  await writeFile(path.join(STORAGE, key), buf);
  const id = randomUUID();
  await db(
    `INSERT INTO "Media" (id, type, "storageKey", url, variants, "mimeType", "sizeBytes", width, height, alt, tags, "createdAt", "updatedAt")
     VALUES ($1, 'IMAGE', $2, $3, $4, 'image/webp', $5, 800, 1000, $6, '{e2e}', now(), now())`,
    [id, key, `/media/${key}`, JSON.stringify({ "800": key }), buf.length, `${FX.album.alt} ${hue}`],
  );
  return id;
}

type Saved = { currentEditionId: string | null; featured: unknown };

export async function setupFixture() {
  await teardownFixture(); // a crashed earlier run may have left rows behind
  const [settings] = await db<Saved>(`SELECT "currentEditionId", featured FROM "SiteSettings" WHERE id = 1`);
  await writeFile(path.join(__dirname, ".fixture-settings.json"), JSON.stringify(settings ?? null));

  const portrait = await image(`${KEY_DIR}/portrait.webp`, 200);
  const photos = [await image(`${KEY_DIR}/photo-1.webp`, 120), await image(`${KEY_DIR}/photo-2.webp`, 60)];

  const editionId = randomUUID();
  await db(`INSERT INTO "AwardEdition" (id, year, slug, "nameEn", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'PUBLISHED', now(), now())`, [editionId, Number(FX.year), FX.year, `E2E Awards ${FX.year}`]);
  const categoryId = randomUUID();
  await db(
    `INSERT INTO "AwardCategory" (id, "editionId", slug, "nameEn", icon, "sortOrder", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'music', 1, 'PUBLISHED', now(), now())`,
    [categoryId, editionId, FX.genre.slug, FX.genre.name],
  );

  const nomineeIds: string[] = [];
  for (const [i, h] of FX.honorees.entries()) {
    const artistId = randomUUID();
    await db(
      `INSERT INTO "Artist" (id, slug, "nameEn", categories, genres, "portraitId", status, "sortOrder", "createdAt", "updatedAt") VALUES ($1, $2, $3, '{SINGER}', '{}', $4, 'PUBLISHED', $5, now(), now())`,
      [artistId, h.slug, h.name, i === 0 ? portrait : null, -100 + i],
    );
    const nomineeId = randomUUID();
    await db(
      `INSERT INTO "Nominee" (id, "categoryId", "artistId", slug, "displayNameEn", "blurbEn", "workTitleEn", "imageId", "sortOrder", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED', now(), now())`,
      [nomineeId, categoryId, artistId, honoreeSlug(h.slug), h.name, h.citation, h.work, i === 0 ? portrait : null, i],
    );
    nomineeIds.push(nomineeId);
  }
  await db(
    `INSERT INTO "Artist" (id, slug, "nameEn", categories, genres, "isLegend", status, "sortOrder", "createdAt", "updatedAt") VALUES ($1, $2, $3, '{MUSICIAN}', '{Ethio-jazz}', true, 'PUBLISHED', -50, now(), now())`,
    [randomUUID(), FX.legend.slug, FX.legend.name],
  );

  const albumId = randomUUID();
  await db(`INSERT INTO "Album" (id, slug, "titleEn", "coverId", "editionId", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, 'PUBLISHED', now(), now())`, [albumId, FX.album.slug, FX.album.title, photos[0], editionId]);
  for (const [i, m] of photos.entries()) await db(`INSERT INTO "AlbumItem" (id, "albumId", "mediaId", "sortOrder") VALUES ($1, $2, $3, $4)`, [randomUUID(), albumId, m, i]);

  await db(`UPDATE "SiteSettings" SET "currentEditionId" = $1, featured = $2 WHERE id = 1`, [editionId, JSON.stringify({ nomineeIds, artistIds: [] })]);
}

export async function teardownFixture() {
  const { readFile } = await import("node:fs/promises");
  const saved = await readFile(path.join(__dirname, ".fixture-settings.json"), "utf8").then((t) => JSON.parse(t) as Saved | null).catch(() => undefined);
  if (saved) await db(`UPDATE "SiteSettings" SET "currentEditionId" = $1, featured = $2 WHERE id = 1`, [saved.currentEditionId, JSON.stringify(saved.featured)]);
  else if (saved === undefined) await db(`UPDATE "SiteSettings" SET "currentEditionId" = NULL WHERE id = 1 AND "currentEditionId" IN (SELECT id FROM "AwardEdition" WHERE year = $1)`, [Number(FX.year)]);
  await db(`DELETE FROM "Album" WHERE slug = $1`, [FX.album.slug]);
  await db(`DELETE FROM "AwardEdition" WHERE year = $1`, [Number(FX.year)]);
  await db(`DELETE FROM "Artist" WHERE slug = ANY($1)`, [[...FX.honorees.map((h) => h.slug), FX.legend.slug]]);
  await db(`DELETE FROM "Media" WHERE "storageKey" LIKE $1`, [`${KEY_DIR}/%`]);
  await rm(path.join(STORAGE, KEY_DIR), { recursive: true, force: true });
  await rm(path.join(__dirname, ".fixture-settings.json"), { force: true });
}
