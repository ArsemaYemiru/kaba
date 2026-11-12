import type { Page } from "@playwright/test";

/** Scroll through the page so scroll-triggered reveals and lazy images have loaded. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 350) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Navigate and wait until React has hydrated, so clicks and shortcuts are handled. */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  return res;
}
