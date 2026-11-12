import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gotoReady } from "./helpers";

// Mirrors scripts/e2e-users.ts (created fresh by global setup on every run).
const SUPER = { email: "e2e-super@example.test", password: "E2E#SuperStart1" };
const EDITOR = { email: "e2e-editor@example.test", password: "E2E#EditorPass1" };
const VICTIM = { email: "e2e-ratelimit@example.test", password: "E2E#RateLimit1" };

const rand = () => Math.floor(Math.random() * 250) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-real-ip": `172.16.${rand()}.${rand()}` });
});

async function login(page: Page, who: { email: string; password: string }) {
  await gotoReady(page, "/admin/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Server Action id from the build manifest (what a client would send in Next-Action). */
function actionId(file: string, exportName: string): string {
  const manifest = JSON.parse(readFileSync(path.resolve(__dirname, "../../.next/server/server-reference-manifest.json"), "utf8")) as {
    node: Record<string, { filename: string; exportedName: string }>;
  };
  const hit = Object.entries(manifest.node).find(([, v]) => v.filename.endsWith(file) && v.exportedName === exportName);
  if (!hit) throw new Error(`action ${exportName} not in manifest`);
  return hit[0];
}

async function callAction(page: Page, url: string, id: string, args: unknown[]) {
  return page.request.post(url, {
    headers: { "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" },
    data: JSON.stringify(args),
    maxRedirects: 0,
  });
}

test("signed-out requests are redirected (pages) or rejected (actions)", async ({ request }) => {
  const res = await request.get("/admin/settings", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain("/admin/login?next=%2Fadmin%2Fsettings");
  const action = await request.post("/admin", { headers: { "Next-Action": "x" }, maxRedirects: 0 });
  expect(action.status()).toBe(401);
  // The public Better Auth sign-in endpoint is disabled; login goes through our rate-limited action.
  expect((await request.post("/api/auth/sign-in/email", { data: SUPER })).status()).toBe(404);
});

test("wrong password shows a generic error", async ({ page }) => {
  await login(page, { email: SUPER.email, password: "definitely-wrong-1" });
  await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password.");
  await login(page, { email: "nobody@example.test", password: "whatever-123456" });
  await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password.");
});

test("login is locked after 5 failures per IP+email for 15 minutes", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await login(page, { email: VICTIM.email, password: `wrong-password-${i}` });
    await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password.");
  }
  await login(page, VICTIM); // correct password, still locked
  await expect(page.locator("form").getByRole("alert")).toContainText("Too many failed attempts");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("super admin is forced to change password, then reaches the dashboard", async ({ page }) => {
  await login(page, SUPER);
  await expect(page).toHaveURL(/\/admin\/change-password$/);
  await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();

  // Can't skip it.
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/change-password$/);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" }).catch(() => {});

  const submit = async (current: string, next: string, confirm = next) => {
    await page.getByLabel("Current password").fill(current);
    await page.getByLabel("New password", { exact: true }).fill(next);
    await page.getByLabel("Confirm new password").fill(confirm);
    await page.getByRole("button", { name: "Update password" }).click();
  };
  await submit(SUPER.password, "short");
  await expect(page.getByText("Use at least 12 characters.")).toBeVisible();
  await submit(SUPER.password, "Feta#Admin2026");
  await expect(page.getByText("You can't reuse a seeded default password.")).toBeVisible();
  await submit(SUPER.password, SUPER.password);
  await expect(page.getByText("Choose a password different from your current one.")).toBeVisible();
  await submit("not-my-current-pw", "A-brand-new-passphrase-1");
  await expect(page.getByText("Current password is incorrect.")).toBeVisible();

  await submit(SUPER.password, "A-brand-new-passphrase-1");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Selam, E2E/ })).toBeVisible();
  await expect(page.getByText("Launch checklist")).toBeVisible();
  await expect(page.getByText("Default passwords changed")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Admin" }).first();
  await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Site Settings" })).toBeVisible();

  const users = await page.goto("/admin/users");
  expect(users?.status()).toBe(200);
  await expect(page.getByText(EDITOR.email)).toBeVisible();

  // The change and the login are in the activity log.
  await page.goto("/admin/activity");
  await expect(page.getByText("password change").first()).toBeVisible();
});

test.describe("editor role", () => {
  test("no Users/Settings in the nav; 403 by direct URL", async ({ page }) => {
    await login(page, EDITOR);
    await expect(page).toHaveURL(/\/admin$/);
    const nav = page.getByRole("navigation", { name: "Admin" }).first();
    await expect(nav.getByRole("link", { name: "Episodes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Site Settings" })).toHaveCount(0);

    for (const url of ["/admin/users", "/admin/settings", "/admin/settings/anything"]) {
      const res = await page.goto(url);
      expect(res?.status(), url).toBe(403);
      await expect(page.getByRole("heading", { name: "403 · Not allowed" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/admin");
    }
  });

  test("403 via Server Action, even when posted from a page the editor can open", async ({ page }) => {
    await login(page, EDITOR);
    await expect(page).toHaveURL(/\/admin$/);
    const id = actionId("src/server/actions/settings.ts", "saveSettingsSection");
    const payload = [{ section: "contact", data: { email: "hacked@example.test" } }];

    // 1) Posted to the settings route: the proxy refuses before the action runs.
    const viaSettings = await callAction(page, "/admin/settings", id, payload);
    expect(viaSettings.status()).toBe(403);

    // 2) Posted to a page the editor can open: Next only runs actions bundled
    //    with that page, so it's refused too. (The action's own role check is
    //    covered by tests/unit/authz-actions.test.ts.)
    const viaDashboard = await callAction(page, "/admin", id, payload);
    expect(await viaDashboard.text()).not.toContain('"ok":true');

    // Nothing changed.
    await page.goto("/admin/activity?entity=SiteSettings");
    await expect(page.getByText("No matching activity.")).toBeVisible();

    // Same for the users action on the users route.
    const usersAction = actionId("src/server/actions/users.ts", "setUserActive");
    const r = await callAction(page, "/admin/users", usersAction, [{ userId: "anything", active: false }]);
    expect(r.status()).toBe(403);
  });

  test("logout ends the session", async ({ page }) => {
    await login(page, EDITOR);
    await expect(page).toHaveURL(/\/admin$/);
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" }).catch(() => {});
    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    const res = await page.request.get("/admin", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
  });
});
