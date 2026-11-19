import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { gotoReady, settle } from "./helpers";
import { latestCode } from "./mailpit";

/**
 * Gate 7 accessibility pass (spec §11): axe-core WCAG 2.1 A/AA on public, auth,
 * member and admin pages. No serious or critical violations allowed; the full
 * results (incl. minor/moderate) are written to docs/awards/a11y/axe-results.json.
 */
test.describe.configure({ mode: "serial" });

const DB = process.env.DATABASE_URL ?? "postgresql://feta:feta@localhost:5436/feta_awards";
const RUN = Date.now().toString(36);
const OUT = path.resolve(__dirname, "../../../../docs/awards/a11y");
const results: { page: string; viewport: number; violations: { id: string; impact: string | null; nodes: number; help: string }[] }[] = [];

async function scan(page: Page, label: string) {
  // Scroll through first so scroll-reveal animations have finished (axe would read mid-fade opacity as low contrast).
  await settle(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("[data-dev-tools]").analyze();
  const violations = r.violations.map((v) => ({ id: v.id, impact: v.impact ?? null, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
  results.push({ page: label, viewport: page.viewportSize()?.width ?? 0, violations });
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of serious) console.log(`[axe] ${label} @${page.viewportSize()?.width}: ${v.id} → ${v.targets.join(" | ")}`);
  expect(serious, `${label}: ${JSON.stringify(serious, null, 1)}`).toEqual([]);
}

test.afterAll(async () => {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "axe-results.json"), JSON.stringify({ tool: "axe-core via @axe-core/playwright 4.14.0", tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"], results }, null, 2));
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  await c.query(`DELETE FROM "ActivityLog" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query(`DELETE FROM "user" WHERE email LIKE 'e2e+%@example.org'`);
  await c.end();
});

const PUBLIC = ["/", "/awards/2026", "/awards/2026/best-male-artist", "/awards/archive", "/vote", "/artists", "/artists/mulatu-astatke", "/videos", "/gallery", "/gallery/red-carpet", "/news", "/news/welcome-to-the-official-feta-awards-website", "/about", "/rules", "/privacy", "/terms", "/sign-in", "/sign-up", "/forgot-password", "/no-such-page"];

for (const width of [390, 1440]) {
  test(`public pages @ ${width}px`, async ({ page, request }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    const nominee = ((await (await request.get("/api/search")).json()) as { href: string }[]).find((i) => i.href.startsWith("/nominees/"))!.href;
    for (const url of [...PUBLIC, nominee]) {
      if (url === "/no-such-page") await page.goto(url);
      else await gotoReady(page, url);
      await scan(page, url);
    }
  });
}

test("member and admin pages", async ({ page, context }) => {
  test.setTimeout(180_000);
  await context.setExtraHTTPHeaders({ "x-real-ip": `192.0.2.${Date.now() % 250}` });
  const email = `e2e+${RUN}-a11y@example.org`;
  const since = Date.now();
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("A11y Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Gold-night-2026!");
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify/);
  await scan(page, "/verify");
  await page.getByLabel("6-digit code").fill(await latestCode(email, /verification code/, since));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/vote$/);
  await scan(page, "/vote (signed-in member)");
  for (const url of ["/account", "/account/ballot", "/awards/2026/best-male-artist"]) {
    await gotoReady(page, url);
    await scan(page, `${url} (signed-in member)`);
  }
  // Admin (throwaway super admin)
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  await c.query(`UPDATE "user" SET role = 'SUPER_ADMIN' WHERE email = $1`, [email]);
  await c.end();
  for (const url of ["/admin", "/admin/editions", "/admin/nominees", "/admin/nominees/new", "/admin/results", "/admin/members", "/admin/monitor", "/admin/media", "/admin/settings", "/admin/security"]) {
    await page.goto(url);
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await scan(page, url);
  }
});
