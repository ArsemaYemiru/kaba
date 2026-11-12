import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { gotoReady } from "./helpers";

/**
 * Phase 4 acceptance against the real seeded logins (spec §8.1). Opt-in:
 *   SEEDED_ACCEPTANCE=1 pnpm exec playwright test seeded-acceptance
 * It changes both seeded passwords, then restores the seeded defaults
 * (and the forced change) with `pnpm admin:reset-password`.
 */
test.skip(process.env.SEEDED_ACCEPTANCE !== "1", "opt-in: set SEEDED_ACCEPTANCE=1");
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "admin@fetashow.com", password: "Feta#Admin2026" };
const EDITOR = { email: "editor@fetashow.com", password: "Feta#Editor2026" };
const NEW_PASSWORD = "Acceptance-Pass-2026!";

test.afterAll(() => {
  for (const u of [ADMIN, EDITOR]) execFileSync("pnpm", ["exec", "tsx", "scripts/reset-password.ts", u.email], { stdio: "inherit" });
});

async function loginAndChange(page: Page, who: { email: string; password: string }) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `192.0.2.${Math.floor(Math.random() * 200) + 1}` });
  await gotoReady(page, "/admin/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/change-password$/);
  await page.getByLabel("Current password").fill(who.password);
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("seeded SUPER_ADMIN logs in and is forced to change password", async ({ page }) => {
  await loginAndChange(page, ADMIN);
  await expect(page.getByRole("heading", { name: "Selam, Feta" })).toBeVisible();
  expect((await page.goto("/admin/users"))?.status()).toBe(200);
  expect((await page.goto("/admin/settings"))?.status()).toBe(200);
});

test("seeded EDITOR gets 403 on Users and Settings", async ({ page }) => {
  await loginAndChange(page, EDITOR);
  expect((await page.goto("/admin/users"))?.status()).toBe(403);
  expect((await page.goto("/admin/settings"))?.status()).toBe(403);
  const r = await page.request.post("/admin/settings", { headers: { "Next-Action": "any" }, data: "[]", maxRedirects: 0 });
  expect(r.status()).toBe(403);
});
