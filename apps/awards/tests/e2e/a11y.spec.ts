import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { gotoReady, settle } from "./helpers";
import { FX, GENRE_URL, HONOREE_URL } from "./fixture";
import { createStaff, deleteTestStaff } from "./staff";

/**
 * Accessibility pass (spec §11): axe-core WCAG 2.1 A/AA on public, auth and
 * admin pages. No serious or critical violations allowed; the full results
 * (incl. minor/moderate) are written to docs/awards/a11y/axe-results.json.
 */
test.describe.configure({ mode: "serial" });

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
  await deleteTestStaff(RUN);
});

const year = FX.year;
const PUBLIC = [
  "/", `/awards/${year}`, GENRE_URL, HONOREE_URL, "/awards/archive", "/artists", `/artists/${FX.legend.slug}`, `/artists/${FX.honorees[0].slug}`,
  "/videos", "/gallery", `/gallery/${FX.album.slug}`, "/news", "/news/welcome-to-the-official-feta-awards-website", "/about", "/privacy", "/terms", "/sign-in", "/forgot-password", "/no-such-page",
];

for (const width of [390, 1440]) {
  test(`public pages @ ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    for (const url of PUBLIC) {
      if (url === "/no-such-page") await page.goto(url);
      else await gotoReady(page, url);
      await scan(page, url);
    }
  });
}

test("admin pages", async ({ page, context }) => {
  test.setTimeout(180_000);
  await context.setExtraHTTPHeaders({ "x-real-ip": `192.0.2.${Date.now() % 250}` });
  const email = `e2e+${RUN}-a11y@example.org`;
  await createStaff(email, "Gold-night-2026!", "SUPER_ADMIN", { name: "A11y Tester" });
  await gotoReady(page, "/sign-in?next=/admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Gold-night-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/admin");
  for (const url of ["/admin", "/admin/editions", "/admin/categories", "/admin/honorees", "/admin/honorees/new", "/admin/artists", "/admin/media", "/admin/settings", "/admin/security"]) {
    await page.goto(url);
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await scan(page, url);
  }
});
