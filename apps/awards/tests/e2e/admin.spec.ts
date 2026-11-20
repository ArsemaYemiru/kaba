import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { gotoReady, waitHydrated } from "./helpers";
import { createStaff, db, deleteTestStaff } from "./staff";

/**
 * Admin (A-76): create an edition and a genre → place artists into it (bulk
 * picker) → write a citation with an uploaded image → announce → the public
 * genre, honoree and artist pages show it. Runs on a throwaway 2099 edition,
 * throwaway artists and staff accounts; everything is removed after.
 */
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const PASSWORD = "Gold-night-2026!";
const YEAR = "2099";
const STORAGE = path.resolve(__dirname, "../../storage");
const emails = { admin: `e2e+${RUN}-sa@example.org`, editor: `e2e+${RUN}-ed@example.org` };
const artists = [
  { slug: `e2e-artist-${RUN}-one`, name: `E2E Artist ${RUN} One` },
  { slug: `e2e-artist-${RUN}-two`, name: `E2E Artist ${RUN} Two` },
];
const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");
async function shot(p: Page, name: string, widths = [1440]) {
  for (const width of widths) {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/p6-${name}-${width}.png`, fullPage: true });
  }
  await p.setViewportSize({ width: 1440, height: 900 });
}
const ids: { edition?: string; category?: string; categorySlug?: string } = {};

let ip = 0;
const newContext = (browser: Browser) => {
  ip += 1;
  return browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "x-real-ip": `198.18.${Number.parseInt(RUN.slice(-2), 36) % 250}.${ip}` } });
};

async function signIn(page: Page, email: string) {
  await gotoReady(page, "/sign-in?next=/admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/admin");
}

async function adminGo(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

let admin: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  await createStaff(emails.admin, PASSWORD, "SUPER_ADMIN", { name: "E2E Admin" });
  for (const a of artists) {
    await db(`INSERT INTO "Artist" (id, slug, "nameEn", categories, status, "updatedAt") VALUES ($1, $2, $3, '{SINGER}', 'PUBLISHED', now())`, [randomUUID(), a.slug, a.name]);
  }
  admin = await newContext(browser);
  page = await admin.newPage();
  await signIn(page, emails.admin);
});

test.afterAll(async () => {
  await admin?.close();
  const media = await db<{ id: string; storageKey: string; variants: Record<string, string> | null }>(
    `SELECT id, "storageKey", variants FROM "Media" WHERE "uploadedById" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
    [`e2e+${RUN}%@example.org`],
  );
  await db(`DELETE FROM "AwardEdition" WHERE year = 2099`);
  await db(`DELETE FROM "Artist" WHERE slug LIKE $1`, [`e2e-artist-${RUN}-%`]);
  await db(`DELETE FROM "Media" WHERE id = ANY($1)`, [media.map((m) => m.id)]);
  await deleteTestStaff(RUN);
  for (const m of media) for (const k of new Set([m.storageKey, ...Object.values(m.variants ?? {})])) rmSync(path.join(STORAGE, k), { force: true });
});

test("every admin page loads for a super admin; an editor gets 403 on settings and staff; voting pages are gone", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const [url, heading] of [
    ["/admin", /^Selam/],
    ["/admin/editions", "Editions"],
    ["/admin/categories", "Genre categories"],
    ["/admin/honorees", "Honorees"],
    ["/admin/artists", "Artists"],
    ["/admin/videos", "Videos"],
    ["/admin/media", "Media Library"],
    ["/admin/gallery", "Gallery"],
    ["/admin/news", "News"],
    ["/admin/settings", "Site Settings"],
    ["/admin/users", "Staff"],
    ["/admin/activity", "Activity Log"],
    ["/admin/security", "Security"],
  ] as const) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading }), url).toBeVisible();
  }
  for (const url of ["/admin/results", "/admin/members", "/admin/monitor", "/admin/nominees"]) expect((await page.goto(url))?.status(), url).toBe(404);
  const nav = page.getByRole("navigation", { name: "Admin" });
  await adminGo(page, "/admin");
  await expect(nav.getByRole("link", { name: /Vote|Results|Members/ })).toHaveCount(0);
  await shot(page, "dashboard", [1440, 390]);

  await createStaff(emails.editor, PASSWORD, "EDITOR", { name: "E2E Editor" });
  const ed = await newContext(browser);
  const ep = await ed.newPage();
  await signIn(ep, emails.editor);
  for (const url of ["/admin/settings", "/admin/users"]) expect((await ep.goto(url))?.status(), url).toBe(403);
  expect((await ep.goto("/admin/honorees"))?.status()).toBe(200);
  await ed.close();
});

test("edition → genre → place artists → citation + image → announce → public pages", async ({ browser }) => {
  test.setTimeout(240_000);

  // Edition (draft first).
  await adminGo(page, "/admin/editions/new");
  await page.getByLabel("Year").fill(YEAR);
  await page.getByLabel("Name (English)").fill(`E2E Awards ${YEAR}`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/editions\/(?!new)[a-z0-9]+$/);
  ids.edition = page.url().split("/").pop()!;
  await expect(page.getByLabel("Voting opens")).toHaveCount(0);

  // Genre (published).
  await adminGo(page, `/admin/categories/new?edition=${ids.edition}`);
  await page.getByLabel("Name (English)").fill("E2E Bati");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/categories\/(?!new)[a-z0-9]+$/);
  ids.category = page.url().split("/").pop()!;
  ids.categorySlug = (await db<{ slug: string }>(`SELECT slug FROM "AwardCategory" WHERE id = $1`, [ids.category]))[0]!.slug;

  // Place both artists into the genre with the bulk picker (drafts).
  const panel = page.getByRole("region", { name: "Add artists to this genre" });
  await waitHydrated(panel.getByRole("button", { name: /^Add/ }));
  await panel.getByLabel("Search artists").fill(`E2E Artist ${RUN}`);
  for (const a of artists) await panel.getByLabel(a.name).check();
  await panel.getByRole("button", { name: "Add 2 selected" }).click();
  await expect(page.getByText("Added 2 artists")).toBeVisible();
  await expect(page.getByRole("link", { name: /2 honorees in this genre/ })).toBeVisible();
  await shot(page, "genre-editor");

  // Write the first honoree's citation, featured work and an uploaded image; publish both.
  const rows = await db<{ id: string; slug: string; artistId: string }>(`SELECT n.id, n.slug, n."artistId" FROM "Nominee" n WHERE n."categoryId" = $1 ORDER BY n."sortOrder"`, [ids.category]);
  expect(rows).toHaveLength(2);
  const png = await sharp({ create: { width: 800, height: 1000, channels: 3, background: { r: 200, g: 150, b: 20 } } }).png().toBuffer();
  await adminGo(page, `/admin/honorees/${rows[0]!.id}`);
  await page.getByLabel("Citation (English)").fill("Recognized in this test genre for e2e purposes.");
  await page.getByLabel("Song, album or video (English)").fill("E2E Song");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  const choose = page.getByRole("button", { name: "Choose" });
  await waitHydrated(choose);
  await choose.click();
  const dialog = page.getByRole("dialog", { name: "Choose image" });
  await dialog.getByLabel("Upload files").setInputFiles({ name: `e2e-${RUN}.png`, mimeType: "image/png", buffer: png });
  await expect(dialog.getByLabel("Uploaded")).toBeVisible({ timeout: 30_000 });
  await dialog.getByLabel("Alt text").first().fill("E2E honoree portrait");
  await dialog.getByRole("button", { name: "Save alt" }).first().click();
  await dialog.getByRole("button", { name: "E2E honoree portrait" }).click();
  await shot(page, "honoree-editor");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();
  const [h1] = await db<{ imageId: string | null; blurbEn: string; displayNameEn: string }>(`SELECT "imageId", "blurbEn", "displayNameEn" FROM "Nominee" WHERE id = $1`, [rows[0]!.id]);
  expect(h1).toMatchObject({ blurbEn: "Recognized in this test genre for e2e purposes.", displayNameEn: artists[0]!.name });
  const [media] = await db<{ mimeType: string; blurDataUrl: string | null }>(`SELECT "mimeType", "blurDataUrl" FROM "Media" WHERE id = $1`, [h1!.imageId]);
  expect(media).toMatchObject({ mimeType: "image/webp" }); // re-encoded by the sharp pipeline
  await db(`UPDATE "Nominee" SET status = 'PUBLISHED' WHERE id = $1`, [rows[1]!.id]);

  // The same artist can't be placed twice in one genre.
  await adminGo(page, `/admin/honorees/new?category=${ids.category}&artist=${rows[0]!.artistId}`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This artist is already honored in this category.").first()).toBeVisible();

  // Draft edition: the genre is a 404 for the public.
  const pub = await newContext(browser);
  const pp = await pub.newPage();
  expect((await pp.goto(`/awards/${YEAR}/${ids.categorySlug}`))?.status()).toBe(404);

  // Announce the edition.
  await adminGo(page, `/admin/editions/${ids.edition}`);
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();

  // Public: genre page lists both honorees equally; honoree and artist pages show the recognition.
  await gotoReady(pp, `/awards/${YEAR}/${ids.categorySlug}`);
  await expect(pp.getByRole("heading", { level: 1, name: "E2E Bati" })).toBeVisible();
  await expect(pp.locator("main article")).toHaveCount(2);
  await gotoReady(pp, `/honorees/${rows[0]!.slug}`);
  await expect(pp.getByRole("heading", { level: 1, name: artists[0]!.name })).toBeVisible();
  await expect(pp.getByText("Recognized in this test genre for e2e purposes.")).toBeVisible();
  await expect(pp.getByText("Featured work: E2E Song")).toBeVisible();
  await gotoReady(pp, `/artists/${artists[0]!.slug}`);
  const tab = pp.getByRole("tab", { name: "Feta Awards" });
  await waitHydrated(tab);
  await tab.click();
  await expect(pp.getByRole("link", { name: new RegExp(`E2E Bati · ${YEAR}`) })).toBeVisible();
  await pub.close();

  const log = await db<{ action: string }>(`SELECT action FROM "ActivityLog" WHERE "entityId" = $1 ORDER BY "createdAt"`, [ids.edition]);
  expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["create", "publish"]));
});

test("CSV import: preview shows row errors and nothing is saved until the file is valid", async () => {
  test.setTimeout(60_000);
  await adminGo(page, "/admin/honorees");
  await page.getByRole("button", { name: "Import CSV" }).click();
  const dialog = page.getByRole("dialog", { name: "Import honorees from CSV" });
  await dialog.getByLabel("Edition").selectOption({ label: `E2E Awards ${YEAR}` });
  const bad = `category,artist,blurbEn,status\nE2E Bati,mulatu-astatke,x,DRAFT\nno-such-genre,mulatu-astatke,x,DRAFT\nE2E Bati,no-such-artist,x,DRAFT\nE2E Bati,${artists[0]!.slug},x,DRAFT\n`;
  await dialog.getByLabel("CSV file").setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from(bad) });
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByText(/1 valid, 3 with errors/)).toBeVisible();
  await expect(dialog.getByText(/no category “no-such-genre”/)).toBeVisible();
  await expect(dialog.getByText(/unknown artist slug “no-such-artist”/)).toBeVisible();
  await expect(dialog.getByText(/already in the category/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Import/ })).toBeDisabled();
  const good = `category,artist,blurbEn,workTitleEn,status\n${ids.categorySlug},mulatu-astatke,"CSV citation",,DRAFT\n`;
  await dialog.getByLabel("CSV file").setInputFiles({ name: "good.csv", mimeType: "text/csv", buffer: Buffer.from(good) });
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByText(/1 valid, 0 with errors/)).toBeVisible();
  await dialog.getByRole("button", { name: "Import 1 honorees" }).click();
  await expect(dialog).toBeHidden();
  const imported = await db<{ blurbEn: string; status: string }>(`SELECT "blurbEn", status FROM "Nominee" WHERE "categoryId" = $1 AND "artistId" = (SELECT id FROM "Artist" WHERE slug = 'mulatu-astatke')`, [ids.category]);
  // Imported as a draft in a throwaway edition (deleted after), never shown publicly.
  expect(imported).toEqual([{ blurbEn: "CSV citation", status: "DRAFT" }]);
});
