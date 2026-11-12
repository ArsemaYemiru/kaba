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
