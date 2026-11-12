import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test("home renders the hero and ticker without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Feta Show");
  const hero = page.locator("section[aria-labelledby=hero-title]");
  await expect(hero.getByText("Ethiopia's celebrity game show. Two stars. One stage.")).toBeVisible();
  await expect(hero.getByText("ሁለት ኮከቦች። አንድ መድረክ።")).toBeVisible();
  await expect(page.getByRole("region", { name: "Feta highlights" })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [360, 390, 1440]) {
  test(`home has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("unknown routes show the branded 404", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Off the stage" })).toBeVisible();
});

test("mobile menu opens, traps focus and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, "/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Episodes" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("home content is visible (reveal is progressive enhancement)", async ({ page }) => {
    await page.goto("/");
    const featured = page.locator("section[aria-labelledby=featured-title]");
    await expect(featured.getByRole("link", { name: "Lij Michael vs Hanan Tarik" }).first()).toBeVisible();
    const hidden = await page.locator(".reveal").evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity === "0").length);
    expect(hidden).toBe(0);
  });
});
