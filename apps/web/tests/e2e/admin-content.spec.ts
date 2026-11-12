import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { gotoReady, waitHydrated } from "./helpers";

// Serial: these tests share the Media Library (new uploads have no alt text yet).
test.describe.configure({ mode: "serial" });

// e2e editor from scripts/e2e-users.ts (no forced password change).
const EDITOR = { email: "e2e-editor@example.test", password: "E2E#EditorPass1" };

/** Wait for the post-login redirect; on failure, report the form's message. */
async function signedIn(page: Page) {
  const alert = page.locator("form [role=alert]");
  await expect(async () => {
    const msg = (await alert.count()) ? await alert.innerText() : "";
    expect(msg, "login form error").toBe("");
    expect(page.url()).toMatch(/\/admin$/);
  }).toPass({ timeout: 20_000 });
}

async function login(page: Page) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `203.0.113.${Math.floor(Math.random() * 200) + 1}` });
  await gotoReady(page, "/admin/login");
  await page.getByLabel("Email").fill(EDITOR.email);
  await page.getByLabel("Password").fill(EDITOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await signedIn(page);
}

/** An abstract generated test image (no people). */
async function testImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#1FAA59"/><circle cx="450" cy="520" r="260" fill="#FFB800"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

test("GATE 5: upload an image, create an artist with it, publish, see it on /artists", async ({ page }) => {
  test.setTimeout(90_000);
  const name = `E2E Artist ${Date.now()}`;
  const alt = `${name} portrait test image`;
  await login(page);

  // 1) Upload in the Media Library and add the required alt text.
  await gotoReady(page, "/admin/media");
  await waitHydrated(page.locator('input[type="file"]'));
  await page.locator('input[type="file"]').setInputFiles({ name: "e2e-portrait.jpg", mimeType: "image/jpeg", buffer: await testImage() });
  await expect(page.getByText("e2e-portrait.jpg")).toBeVisible();
  await expect(page.getByLabel("Uploaded")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  await page.getByRole("button", { name: /Missing alt text/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Edit media" });
  await dialog.getByLabel("Alt text (required)").fill(alt);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  // 2) Create the artist with that image as portrait, published.
  await gotoReady(page, "/admin/artists/new");
  await page.getByLabel(/^Name \(English\)/).fill(name);
  await page.getByRole("button", { name: "Singer", exact: true }).click();
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.locator('[data-field="portraitId"]').getByRole("button", { name: "Choose" }).click();
  const picker = page.getByRole("dialog", { name: "Choose image" });
  await picker.getByRole("button", { name: alt }).click();
  await expect(page.locator('[data-field="portraitId"]').getByText(alt)).toBeVisible();
  await page.keyboard.press("Control+s");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/artists\/[a-z0-9]+$/);

  // 3) It's live on the public directory with the uploaded photo, immediately.
  await page.goto("/artists");
  const card = page.getByRole("link", { name: new RegExp(name) });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img", { name: alt })).toBeVisible();
  await card.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

const OWNER = { email: "e2e-owner@example.test", password: "E2E#OwnerPass12" };
async function loginAs(page: Page, who: { email: string; password: string }) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `203.0.113.${Math.floor(Math.random() * 200) + 1}` });
  await gotoReady(page, "/admin/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await signedIn(page);
}

test("episode with participants, rounds and a result shows a public scoreboard; unpublish → 404", async ({ page }) => {
  test.setTimeout(90_000);
  const title = `E2E Episode ${Date.now()} vs Test`;
  await login(page);
  await gotoReady(page, "/admin/episodes/new");
  await page.getByLabel(/^Title \(English\)/).fill(title);
  const parts = page.locator('[data-field="participants"]');
  await parts.getByLabel("…or guest / team name").nth(0).fill("E2E Side A");
  await parts.getByLabel("Artist profile").nth(1).selectOption({ label: "Mulatu Astatke" });
  await page.getByRole("button", { name: "Add round" }).click();
  await page.getByLabel("Score A").fill("30");
  await page.getByLabel("Score B").fill("20");
  await page.getByLabel("Result").selectOption("A");
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const slug = (await page.getByLabel("URL slug").inputValue()) || "";
  expect(slug).toMatch(/^e2e-episode-/);

  const pub = await page.goto(`/episodes/${slug}`);
  expect(pub?.status()).toBe(200);
  const board = page.getByRole("table");
  await expect(board.getByText("Round 1")).toBeVisible();
  await expect(board.locator("tfoot")).toContainText("30");
  // Published artist participant is linked; the guest name is not.
  await expect(page.locator("section[aria-labelledby=contestants-title]").getByRole("link", { name: /Mulatu Astatke/ })).toBeVisible();

  // Bulk unpublish from the list.
  await gotoReady(page, `/admin/episodes?q=${encodeURIComponent(title)}`);
  await page.getByRole("checkbox", { name: "Select row" }).first().check();
  await page.getByRole("toolbar", { name: "Bulk actions" }).getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText(/Unpublish: 1 item/)).toBeVisible();
  expect((await page.goto(`/episodes/${slug}`))?.status()).toBe(404);
  // …and it's gone from the public search index.
  const index = (await (await page.request.get("/api/search")).json()) as { title: string }[];
  expect(index.some((i) => i.title === title)).toBe(false);
});

test("deleting in-use media asks for confirmation and falls back to the branded portrait", async ({ page }) => {
  test.setTimeout(90_000);
  const name = `E2E Artist Media ${Date.now()}`;
  const alt = `${name} test image`;
  await login(page);
  await gotoReady(page, "/admin/media");
  await waitHydrated(page.locator('input[type="file"]'));
  await page.locator('input[type="file"]').setInputFiles({ name: "e2e-del.jpg", mimeType: "image/jpeg", buffer: await testImage() });
  await expect(page.getByLabel("Uploaded")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  await page.getByRole("button", { name: /Missing alt text/ }).first().click();
  await page.getByRole("dialog", { name: "Edit media" }).getByLabel("Alt text (required)").fill(alt);
  await page.getByRole("dialog", { name: "Edit media" }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog", { name: "Edit media" })).toBeHidden();

  await gotoReady(page, "/admin/artists/new");
  await page.getByLabel(/^Name \(English\)/).fill(name);
  await page.getByRole("button", { name: "Actor", exact: true }).click();
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.locator('[data-field="portraitId"]').getByRole("button", { name: "Choose" }).click();
  await page.getByRole("dialog", { name: "Choose image" }).getByRole("button", { name: alt }).click();
  await page.keyboard.press("Control+s");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await gotoReady(page, `/admin/media?q=${encodeURIComponent(alt)}`);
  await page.getByRole("button", { name: alt }).first().click();
  const dlg = page.getByRole("dialog", { name: "Edit media" });
  await expect(dlg.getByRole("link", { name: `Artist portrait · ${name}` })).toBeVisible();
  let confirmText = "";
  page.once("dialog", (d) => {
    confirmText = d.message();
    void d.accept();
  });
  await dlg.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted", { exact: true })).toBeVisible();
  expect(confirmText).toContain(`Artist portrait · ${name}`);

  await page.goto("/artists");
  const card = page.getByRole("link", { name: new RegExp(name) });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img", { name })).toBeVisible(); // branded fallback (role=img, labelled with the name)
});

test("site settings: a ticker change shows on Home immediately (then restored)", async ({ page }) => {
  test.setTimeout(90_000);
  const item = `E2E ticker ${Date.now()}`;
  await loginAs(page, OWNER);
  await gotoReady(page, "/admin/settings");
  const ticker = page.getByLabel("Ticker items");
  await waitHydrated(ticker); // RHF fills uncontrolled fields only after hydration
  await expect(ticker).not.toHaveValue("");
  const original = await ticker.inputValue();
  expect(original.trim(), "refusing to run: original ticker is empty").not.toBe("");
  const section = page.locator("form", { has: page.getByRole("heading", { name: "Ticker" }) });
  try {
    await ticker.fill(`${original}\n${item}`);
    await section.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Ticker saved")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Feta highlights" })).toContainText(item.toUpperCase().replace(/(\d+)/, "$1"), { ignoreCase: true });
  } finally {
    await gotoReady(page, "/admin/settings");
    await waitHydrated(page.getByLabel("Ticker items"));
    await page.getByLabel("Ticker items").fill(original);
    await page.locator("form", { has: page.getByRole("heading", { name: "Ticker" }) }).getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Ticker saved")).toBeVisible();
  }
});

test("submissions CSV export is protected and safe to open in a spreadsheet", async ({ page, request }) => {
  expect((await request.get("/api/admin/submissions/export?type=CONTESTANT")).status()).toBe(401);
  await login(page);
  await gotoReady(page, "/admin/submissions?type=CONTESTANT");
  await expect(page.getByRole("link", { name: "Contestants" })).toHaveAttribute("aria-current", "page");
  const res = await page.request.get("/api/admin/submissions/export?type=CONTESTANT");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv.split("\r\n")[0]).toContain("Received (Addis Ababa)");
  expect(csv).not.toMatch(/(^|,)[=+@]/m); // formula injection neutralised
});

test("super admin creates a user and resets a password", async ({ page }) => {
  const email = `e2e-created-${Date.now()}@example.test`;
  await loginAs(page, OWNER);
  await gotoReady(page, "/admin/users");
  await page.getByRole("button", { name: "Add user" }).click();
  const dlg = page.getByRole("dialog", { name: "Add user" });
  await dlg.getByLabel("Name").fill("E2E Created");
  await dlg.getByLabel("Email").fill(email);
  await dlg.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText("User created")).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row.getByText("Must change password")).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await row.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("dialog", { name: "Temporary password" })).toBeVisible();
});
