import { expect, test } from "@playwright/test";
import { gotoReady, horizontalOverflow } from "./helpers";

test("home renders the hero without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Feta Awards");
  const hero = page.locator("section[aria-labelledby=hero-title]");
  await expect(hero.getByText("Celebrating Ethiopian artists, genre by genre.")).toBeVisible();
  await expect(hero.getByText("የኢትዮጵያን ብሩህ ኮከቦች እናክብር።")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [360, 390, 1440]) {
  test(`home has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
}

test("unknown routes show the branded 404", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Off the red carpet" })).toBeVisible();
});

test("mobile menu opens with the main sections (no sign-in) and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, "/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog.getByRole("link", { name: "Awards", exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Artists", exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
