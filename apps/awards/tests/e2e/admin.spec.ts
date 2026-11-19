import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { rmSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import sharp from "sharp";
import { gotoReady, waitHydrated } from "./helpers";
import { latestCode } from "./mailpit";

/**
 * Gate 6: create a category and a nominee with an uploaded image → members vote →
 * admin closes voting, locks and publishes → the winners page shows the winner.
 * Runs on a throwaway 2099 edition and throwaway accounts; everything is removed after.
 */
test.describe.configure({ mode: "serial" });

const DB = process.env.DATABASE_URL ?? "postgresql://feta:feta@localhost:5436/feta_awards";
const RUN = Date.now().toString(36);
const PASSWORD = "Gold-night-2026!";
const YEAR = "2099";
const STORAGE = path.resolve(__dirname, "../../storage");
const emails = { admin: `e2e+${RUN}-sa@example.org`, editor: `e2e+${RUN}-ed@example.org`, v1: `e2e+${RUN}-v1@example.org`, v2: `e2e+${RUN}-v2@example.org`, v3: `e2e+${RUN}-v3@example.org` };
const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");
async function shot(p: Page, name: string, widths = [1440]) {
  for (const width of widths) {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/p6-${name}-${width}.png`, fullPage: true });
  }
  await p.setViewportSize({ width: 1440, height: 900 });
}
const ids: { edition?: string; category?: string; categorySlug?: string; mediaKeys: string[] } = { mediaKeys: [] };

async function db<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

let ip = 0;
const newContext = (browser: Browser) => {
  ip += 1;
  return browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "x-real-ip": `198.18.${Number.parseInt(RUN.slice(-2), 36) % 250}.${ip}` } });
};

async function signUpVerified(page: Page, email: string) {
  const since = Date.now();
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("E2E Person");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email, /verification code/, since));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/vote$/);
}

async function adminGo(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

/** Addis Ababa local "YYYY-MM-DDTHH:MM" (UTC+3). */
const eat = (ms: number) => new Date(ms + 3 * 3600_000).toISOString().slice(0, 16);

let admin: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  admin = await newContext(browser);
  page = await admin.newPage();
  await signUpVerified(page, emails.admin);
  await db(`UPDATE "user" SET role = 'SUPER_ADMIN', "mustChangePassword" = false WHERE email = $1`, [emails.admin]);
});

test.afterAll(async () => {
  await admin?.close();
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  const media = await c.query(`SELECT id, "storageKey", variants FROM "Media" WHERE "uploadedById" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query("BEGIN");
  await c.query("SET LOCAL feta.allow_vote_event_delete = 'on'");
  await c.query(`DELETE FROM "VoteEvent" WHERE "editionId" IN (SELECT id FROM "AwardEdition" WHERE year = 2099) OR "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query("COMMIT");
  await c.query(`DELETE FROM "AwardEdition" WHERE year = 2099`);
  await c.query(`DELETE FROM "Vote" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query(`DELETE FROM "Media" WHERE id = ANY($1)`, [media.rows.map((m) => m.id)]);
  await c.query(`DELETE FROM "ActivityLog" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query(`DELETE FROM "user" WHERE email LIKE 'e2e+%@example.org'`);
  await c.end();
  for (const m of media.rows) for (const k of new Set([m.storageKey, ...Object.values((m.variants as Record<string, string>) ?? {})])) rmSync(path.join(STORAGE, k as string), { force: true });
});

test("every admin page loads for a super admin; an editor gets 403 on settings and staff", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const [url, heading] of [
    ["/admin", /^Selam/],
    ["/admin/editions", "Editions"],
    ["/admin/categories", "Categories"],
    ["/admin/nominees", "Nominees"],
    ["/admin/results", /^Results/],
    ["/admin/members", "Members"],
    ["/admin/monitor", "Vote monitor"],
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

  await adminGo(page, "/admin");
  await shot(page, "dashboard", [1440, 390]);
  await adminGo(page, "/admin/monitor");
  await shot(page, "vote-monitor");
  await adminGo(page, "/admin/members");
  await shot(page, "members");

  const ed = await newContext(browser);
  const ep = await ed.newPage();
  await signUpVerified(ep, emails.editor);
  await db(`UPDATE "user" SET role = 'EDITOR', "mustChangePassword" = false WHERE email = $1`, [emails.editor]);
  for (const url of ["/admin/settings", "/admin/users"]) expect((await ep.goto(url))?.status(), url).toBe(403);
  expect((await ep.goto("/admin/nominees"))?.status()).toBe(200);
  await ed.close();
});

test("Gate 6: category + nominee with uploaded image → votes → close, lock, publish → winners page", async ({ browser }) => {
  test.setTimeout(240_000);
  const now = Date.now();

  // Edition (published, voting window around now).
  await adminGo(page, "/admin/editions/new");
  await page.getByLabel("Year").fill(YEAR);
  await page.getByLabel("Name (English)").fill(`E2E Awards ${YEAR}`);
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByLabel("Voting opens").fill(eat(now - 3600_000));
  await page.getByLabel("Voting closes").fill(eat(now + 86_400_000));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/editions\/(?!new)[a-z0-9]+$/);
  ids.edition = page.url().split("/").pop()!;

  // Category (public vote, published).
  await adminGo(page, `/admin/categories/new?edition=${ids.edition}`);
  await page.getByLabel("Name (English)").fill("E2E Best Song");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByLabel("Nominee type").selectOption("PERSON");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/categories\/(?!new)[a-z0-9]+$/);
  ids.category = page.url().split("/").pop()!;
  ids.categorySlug = (await db<{ slug: string }>(`SELECT slug FROM "AwardCategory" WHERE id = $1`, [ids.category]))[0]!.slug;

  // Nominee A with an uploaded image (Media Library upload inline, alt text required).
  const png = await sharp({ create: { width: 800, height: 1000, channels: 3, background: { r: 200, g: 150, b: 20 } } }).png().toBuffer();
  await adminGo(page, `/admin/nominees/new?category=${ids.category}`);
  await page.getByLabel("Display name (English)").fill("E2E Nominee A");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  const choose = page.getByRole("button", { name: "Choose" });
  await waitHydrated(choose);
  await choose.click();
  const dialog = page.getByRole("dialog", { name: "Choose image" });
  await dialog.getByLabel("Upload files").setInputFiles({ name: `e2e-${RUN}.png`, mimeType: "image/png", buffer: png });
  await expect(dialog.getByLabel("Uploaded")).toBeVisible({ timeout: 30_000 });
  await dialog.getByLabel("Alt text").first().fill("E2E Nominee A artwork");
  await dialog.getByRole("button", { name: "Save alt" }).first().click();
  await dialog.getByRole("button", { name: "E2E Nominee A artwork" }).click();
  await expect(page.getByText("E2E Nominee A artwork").first()).toBeVisible();
  await shot(page, "nominee-editor");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/nominees\/(?!new)[a-z0-9]+$/);
  const [nomA] = await db<{ id: string; slug: string; imageId: string | null }>(`SELECT id, slug, "imageId" FROM "Nominee" WHERE "categoryId" = $1 AND "displayNameEn" = 'E2E Nominee A'`, [ids.category]);
  expect(nomA!.imageId).not.toBeNull();
  const [media] = await db<{ mimeType: string; width: number; blurDataUrl: string | null }>(`SELECT "mimeType", width, "blurDataUrl" FROM "Media" WHERE id = $1`, [nomA!.imageId]);
  expect(media).toMatchObject({ mimeType: "image/webp" }); // re-encoded by the sharp pipeline
  expect(media!.blurDataUrl).toBeTruthy();

  // Nominee B (no image → branded fallback).
  await adminGo(page, `/admin/nominees/new?category=${ids.category}`);
  await page.getByLabel("Display name (English)").fill("E2E Nominee B");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/nominees\/(?!new)[a-z0-9]+$/);

  // Phases: Draft → Nominees announced → Voting open (one step at a time, confirmed).
  const phase = async (button: RegExp, reason?: string) => {
    await adminGo(page, `/admin/editions/${ids.edition}`);
    await page.getByRole("button", { name: button }).click();
    if (reason) await page.getByLabel(/Reason for going back/).fill(reason);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/^Phase: /).first()).toBeVisible();
  };
  await phase(/Move to Nominees announced/);
  await phase(/Move to Voting open/);

  // Members vote: A, A, B.
  const voteAs = async (email: string, name: string) => {
    const ctx = await newContext(browser);
    const p = await ctx.newPage();
    await signUpVerified(p, email);
    await gotoReady(p, `/awards/${YEAR}/${ids.categorySlug}`);
    await p.getByRole("button", { name: `Vote for ${name}` }).click();
    await expect(p.getByRole("button", { name: `Your vote: ${name}` })).toBeVisible();
    // No counts anywhere on the public page while voting is open.
    expect(await p.content()).not.toMatch(/totalVotes|publicShare|"votes"\s*:/);
    await ctx.close();
  };
  await voteAs(emails.v1, "E2E Nominee A");
  await voteAs(emails.v2, "E2E Nominee A");
  await voteAs(emails.v3, "E2E Nominee B");

  // Close voting, lock, publish.
  await phase(/Move to Voting closed/);
  await adminGo(page, `/admin/results?edition=${ids.edition}`);
  const board = page.getByRole("region", { name: "E2E Best Song" });
  await expect(board.getByRole("row", { name: /E2E Nominee A/ })).toContainText("2");
  await page.getByRole("button", { name: "Lock results" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lock results" }).click();
  await expect(page.getByText(/SHA-256 [0-9a-f]{16}…/)).toBeVisible();
  await page.getByRole("button", { name: "Publish winners" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await shot(page, "results-published");

  // Public winners page + nominee page show the winner.
  const pub = await newContext(browser);
  const pp = await pub.newPage();
  await gotoReady(pp, `/awards/${YEAR}/winners`);
  const winner = pp.locator("main a.foil-frame").filter({ hasText: "E2E Nominee A" });
  await expect(winner).toBeVisible();
  await expect(winner).toContainText("E2E Best Song");
  await expect(pp.locator("main").getByText("E2E Nominee B")).toHaveCount(0);
  await expect(pp.getByText("of the public vote")).toHaveCount(0); // percentages off for this edition
  await gotoReady(pp, `/nominees/${nomA!.slug}`);
  await expect(pp.getByText(/^Winner · E2E Best Song/)).toBeVisible();
  await pub.close();

  // The audit trail recorded the phase changes, lock and publish.
  const log = await db<{ action: string }>(`SELECT action FROM "ActivityLog" WHERE "entityId" = $1 ORDER BY "createdAt"`, [ids.edition]);
  expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["create", "phase_change", "lock_results"]));
});

test("CSV import: preview shows row errors and nothing is saved until the file is valid", async () => {
  test.setTimeout(60_000);
  await adminGo(page, "/admin/nominees");
  await page.getByRole("button", { name: "Import CSV" }).click();
  const dialog = page.getByRole("dialog", { name: "Import nominees from CSV" });
  await dialog.getByLabel("Edition").selectOption({ label: `E2E Awards ${YEAR}` });
  const bad = `category,displayNameEn,status\ne2e-best-song,CSV Nominee One,PUBLISHED\nno-such-category,CSV Nominee Two,DRAFT\ne2e-best-song,,DRAFT\n`;
  await dialog.getByLabel("CSV file").setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from(bad) });
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByText(/1 valid, 2 with errors/)).toBeVisible();
  await expect(dialog.getByText(/no category “no-such-category”/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Import/ })).toBeDisabled();
  const good = `category,displayNameEn,artists,status\nE2E Best Song,CSV Nominee One,,DRAFT\ne2e-best-song,CSV Nominee Two,mulatu-astatke,DRAFT\n`;
  await dialog.getByLabel("CSV file").setInputFiles({ name: "good.csv", mimeType: "text/csv", buffer: Buffer.from(good) });
  await dialog.getByRole("button", { name: "Preview" }).click();
  await expect(dialog.getByText(/2 valid, 0 with errors/)).toBeVisible();
  await dialog.getByRole("button", { name: "Import 2 nominees" }).click();
  await expect(dialog).toBeHidden();
  const rows = await db<{ displayNameEn: string; artists: number }>(
    `SELECT n."displayNameEn", (SELECT count(*)::int FROM "NomineeArtist" a WHERE a."nomineeId" = n.id) AS artists FROM "Nominee" n WHERE n."categoryId" = $1 AND n."displayNameEn" LIKE 'CSV Nominee%' ORDER BY n."sortOrder"`,
    [ids.category],
  );
  expect(rows).toEqual([
    { displayNameEn: "CSV Nominee One", artists: 0 },
    { displayNameEn: "CSV Nominee Two", artists: 1 },
  ]);
});
