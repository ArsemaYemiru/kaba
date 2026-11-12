import { expect, test } from "@playwright/test";
import path from "node:path";
import { horizontalOverflow, settle } from "./helpers";

const OUT = path.resolve(__dirname, "../../../../docs/screens");

const PAGES = [
  { name: "home", path: "/" },
  { name: "episodes", path: "/episodes" },
  { name: "episode", path: "/episodes/lij-michael-vs-hanan-tarik" },
  { name: "artists", path: "/artists" },
  { name: "artist-legend", path: "/artists/mulatu-astatke" },
  { name: "gallery", path: "/gallery" },
];

for (const width of [390, 1440]) {
  for (const p of PAGES) {
    test(`${p.name} @ ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width, height: 900 });
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await settle(page);
      expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `${OUT}/${p.name}-${width}.png`, fullPage: true });
    });
  }

  test(`styleguide @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const res = await page.goto("/styleguide");
    test.skip(res?.status() === 404, "build with ENABLE_STYLEGUIDE=1 to capture the styleguide");
    await settle(page);
    const ethiopic = await page.evaluate(() => {
      const loaded = [...document.fonts].filter((f) => /Noto.Sans.Ethiopic/i.test(f.family) && f.status === "loaded");
      const el = document.querySelector('[lang="am"]');
      return { loaded: loaded.length, family: el ? getComputedStyle(el).fontFamily : "" };
    });
    expect(ethiopic.loaded).toBeGreaterThan(0);
    expect(ethiopic.family).toMatch(/Noto.Sans.Ethiopic/i);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${OUT}/styleguide-${width}.png`, fullPage: true });
  });
}

for (const width of [390, 1440]) {
  test(`admin login + dashboard @ ${width}px`, async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-real-ip": `198.51.100.${width === 390 ? 1 : 2}` });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/login");
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await page.screenshot({ path: `${OUT}/admin-login-${width}.png`, fullPage: true });
    await page.getByLabel("Email").fill("e2e-editor@example.test");
    await page.getByLabel("Password").fill("E2E#EditorPass1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Launch checklist")).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${OUT}/admin-dashboard-${width}.png`, fullPage: true });
  });
}

for (const width of [390, 1440]) {
  test(`admin modules @ ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setExtraHTTPHeaders({ "x-real-ip": `198.51.100.${width === 390 ? 11 : 12}` });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/login");
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await page.getByLabel("Email").fill("e2e-owner@example.test");
    await page.getByLabel("Password").fill("E2E#OwnerPass12");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
    for (const [name, path] of [
      ["admin-artists", "/admin/artists"],
      ["admin-artist-edit", "/admin/artists?q=Mulatu"],
      ["admin-episodes", "/admin/episodes"],
      ["admin-media", "/admin/media"],
      ["admin-settings", "/admin/settings"],
    ] as const) {
      await page.goto(path);
      if (name === "admin-artist-edit") await page.getByRole("link", { name: /Mulatu Astatke/ }).first().click();
      await expect(page.locator("main h1, form h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await horizontalOverflow(page), `${name} overflow`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
    }
  });
}
