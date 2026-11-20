import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { gotoReady, horizontalOverflow, settle, waitHydrated } from "./helpers";
import { latestCode } from "./mailpit";
import { createStaff, deleteTestStaff } from "./staff";
import { totp } from "./totp";

/**
 * Staff-only accounts (A-77): no public sign-up; staff sign in, are forced to
 * change a seeded password, can reset by email code and use TOTP two-factor.
 * Accounts created here use the e2e+…@example.org pattern and are deleted after.
 */
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const EMAIL = `e2e+${RUN}@example.org`;
const PASSWORD = "Gold-night-2026!";
let ipCounter = 0;

/** Each test gets its own client IP so the per-IP limits never collide between runs. */
test.beforeEach(async ({ context }) => {
  ipCounter += 1;
  await context.setExtraHTTPHeaders({ "x-real-ip": `198.51.100.${(Number.parseInt(RUN.slice(-2), 36) + ipCounter * 7) % 250}` });
});

test.beforeAll(async () => {
  await createStaff(EMAIL, PASSWORD, "EDITOR", { name: "E2E Editor" });
});

test.afterAll(async () => {
  await deleteTestStaff(RUN);
});

async function signIn(page: Page, email: string, password: string, next?: string) {
  await gotoReady(page, next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("there is no public sign-up: pages and the Better Auth endpoints are 404", async ({ request }) => {
  for (const url of ["/sign-up", "/verify", "/account"]) expect((await request.get(url, { maxRedirects: 0 })).status(), url).toBe(404);
  const r = await request.post("/api/auth/sign-up/email", { data: { email: `e2e+${RUN}-x@example.org`, password: PASSWORD, name: "X" } });
  expect(r.status()).toBe(404);
  for (const p of ["/api/auth/sign-in/social", "/api/auth/email-otp/send-verification-otp"]) expect((await request.post(p, { data: {} })).status(), p).toBe(404);
});

test("staff sign in (wrong password keeps the email), land in the admin, sign out", async ({ page }) => {
  await signIn(page, EMAIL, "wrong-password-123", "/admin");
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/admin");
  await expect(page.getByRole("heading", { level: 1, name: /^Selam/ })).toBeVisible();
  const menu = page.getByRole("button", { name: /^Account menu for / });
  await waitHydrated(menu);
  await menu.click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("password reset by email code", async ({ page }) => {
  const since = Date.now();
  await gotoReady(page, "/forgot-password");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page).toHaveURL(/\/reset-password\?email=/);
  const code = await latestCode(EMAIL, /password reset code/, since);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByLabel("New password", { exact: true }).fill(`${PASSWORD}x`);
  await page.getByLabel("Confirm new password").fill(`${PASSWORD}x`);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=1$/);
  await signIn(page, EMAIL, `${PASSWORD}x`);
  await page.waitForURL((u) => u.pathname === "/admin");
});

test("forced password change first; signed-out admin goes to sign-in", async ({ page, request }) => {
  const r = await request.get("/admin/security", { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers().location).toContain("/sign-in?next=%2Fadmin%2Fsecurity");
  const login = await request.get("/admin/login", { maxRedirects: 0 });
  expect(login.headers().location).toContain("/sign-in?next=/admin");

  const forced = `e2e+${RUN}-forced@example.org`;
  await createStaff(forced, PASSWORD, "EDITOR", { mustChangePassword: true });
  await signIn(page, forced, PASSWORD, "/admin");
  await expect(page).toHaveURL(/\/admin\/change-password$/);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  const blocked = await page.goto("/admin/security");
  expect(blocked?.url()).toMatch(/\/admin\/change-password$/);
});

test("staff two-factor: set up with an authenticator, then sign in with a code", async ({ page }) => {
  test.setTimeout(60_000);
  const email = `e2e+${RUN}-2fa@example.org`;
  await createStaff(email, PASSWORD, "EDITOR");
  await signIn(page, email, PASSWORD, "/admin/security");
  await expect(page).toHaveURL(/\/admin\/security$/);
  await waitHydrated(page.getByRole("button", { name: "Set up two-factor" }));
  await page.getByLabel("Confirm your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Set up two-factor" }).click();
  await expect(page.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
  const secret = (await page.locator("button .font-mono").textContent())!.trim();
  await expect(page.getByRole("list", { name: "Backup codes" }).getByRole("listitem")).toHaveCount(10);
  await page.getByLabel("Code from your app").fill(totp(secret));
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await expect(page.getByText("Two-factor authentication is on.")).toBeVisible();

  await page.getByRole("button", { name: /^Account menu for / }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, email, PASSWORD, "/admin");
  await expect(page).toHaveURL(/\/two-factor\?next=%2Fadmin$/);
  await page.getByLabel("Authentication code").fill("000000" === totp(secret) ? "111111" : "000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("That code isn't right.")).toBeVisible();
  await page.getByLabel("Authentication code").fill(totp(secret));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => u.pathname === "/admin");
  await expect(page.getByRole("heading", { level: 1, name: /^Selam/ })).toBeVisible();
});

test("auth pages are private and never cached", async ({ request }) => {
  for (const url of ["/sign-in", "/forgot-password", "/two-factor"]) {
    const r = await request.get(url, { maxRedirects: 0 });
    expect(r.headers()["cache-control"], url).toBe("private, no-store");
    expect(r.headers()["content-security-policy"], url).toContain("frame-ancestors 'none'");
  }
});

test("sign-in screenshots", async ({ browser }) => {
  const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await gotoReady(page, "/sign-in");
    await settle(page);
    expect(await horizontalOverflow(page), `sign-in @ ${width}`).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${OUT}/p4-sign-in-${width}.png`, fullPage: true });
    await context.close();
  }
});
