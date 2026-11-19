import { expect, test } from "@playwright/test";
import path from "node:path";
import { horizontalOverflow, settle } from "./helpers";

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

    // Countdown has started ticking on the client.
    await expect(page.locator("#countdown ol").first()).not.toContainText("––");

    expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `${OUT}/styleguide-${width}.png`, fullPage: true });
  });
}
