import { expect, test } from "@playwright/test";
import path from "node:path";
import { horizontalOverflow, settle } from "./helpers";
import { FX, GENRE_URL, HONOREE_URL } from "./fixture";

const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");

for (const width of [390, 1440]) {
  test(`styleguide @ ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setViewportSize({ width, height: 900 });
    const res = await page.goto("/styleguide");
    test.skip(res?.status() === 404, "build with ENABLE_STYLEGUIDE=1 to capture the styleguide");
    await settle(page);

    // Amharic check: the Ethiopic face is loaded and used by lang="am" text.
    const ethiopic = await page.evaluate(() => {
      const loaded = [...document.fonts].filter((f) => /Noto.Sans.Ethiopic/i.test(f.family) && f.status === "loaded");
      const el = document.querySelector('[lang="am"]');
      return { loaded: loaded.length, family: el ? getComputedStyle(el).fontFamily : "" };
    });
    expect(ethiopic.loaded).toBeGreaterThan(0);
    expect(ethiopic.family).toMatch(/Noto.Sans.Ethiopic/i);

    expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `${OUT}/styleguide-${width}.png`, fullPage: true });
  });
}

/** Public screenshots of the recognition pages (A-76). */
const year = FX.year;
for (const [name, url] of [
  ["home", "/"],
  ["edition", `/awards/${year}`],
  ["genre", GENRE_URL],
  ["honoree", HONOREE_URL],
  ["artist-recognized", `/artists/${FX.honorees[0].slug}`],
  ["artists", "/artists"],
] as const) {
  test(`screens: ${name}`, async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
      await settle(page);
      expect(await horizontalOverflow(page), `${name} @ ${width}`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${OUT}/r-${name}-${width}.png`, fullPage: true });
    }
  });
}
