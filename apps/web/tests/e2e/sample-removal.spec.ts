import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

/**
 * §12: "Remove sample data" leaves artists, episodes and settings intact.
 * Destructive, so opt-in:  SAMPLE_REMOVAL=1 pnpm exec playwright test sample-removal
 * Restore afterwards with `pnpm db:seed` (it recreates only missing rows).
 */
test.skip(process.env.SAMPLE_REMOVAL !== "1", "opt-in: set SAMPLE_REMOVAL=1");

test("remove sample data keeps artists, episodes, videos and settings", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/artists");
  const artistsBefore = await page.getByRole("status").filter({ hasText: "result" }).innerText();
  await page.goto("/episodes");
  const episodesBefore = await page.getByRole("status").filter({ hasText: "result" }).innerText();

  await page.setExtraHTTPHeaders({ "x-real-ip": "198.18.0.9" });
  await gotoReady(page, "/admin/login");
  await page.getByLabel("Email").fill("e2e-owner@example.test");
  await page.getByLabel("Password").fill("E2E#OwnerPass12");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  await expect(page.getByText("Sample data removed")).toBeVisible();

  await gotoReady(page, "/admin/settings");
  const zone = page.getByRole("region", { name: "Danger zone" });
  await expect(zone.getByRole("button", { name: "Remove sample data" })).toBeDisabled();
  await zone.getByLabel("Type REMOVE SAMPLE DATA to confirm").fill("REMOVE SAMPLE DATA");
  await zone.getByRole("button", { name: "Remove sample data" }).click();
  await expect(page.getByText(/^Removed: /)).toBeVisible({ timeout: 20_000 });

  // Content intact on the public site.
  await page.goto("/artists");
  await expect(page.getByRole("status").filter({ hasText: "result" })).toHaveText(artistsBefore);
  await page.goto("/episodes");
  await expect(page.getByRole("status").filter({ hasText: "result" })).toHaveText(episodesBefore);
  await page.goto("/videos");
  await expect(page.getByRole("button", { name: /Play/ }).first()).toBeVisible();
  // Settings intact (tagline, ticker), and the sample gallery is gone with a branded empty state.
  await page.goto("/");
  await expect(page.getByText("Ethiopia's celebrity game show. Two stars. One stage.").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Feta highlights" })).toBeVisible();
  await page.goto("/gallery");
  await expect(page.getByText("Albums are coming soon.")).toBeVisible();
  await page.goto("/news");
  await expect(page.getByRole("link", { name: /Welcome to the new home of Feta Show/ })).toBeVisible();

  // Checklist now reports it done.
  await page.goto("/admin");
  const item = page.getByRole("listitem").filter({ hasText: "Sample data removed" });
  await expect(item.getByLabel("Done")).toBeVisible();
});
