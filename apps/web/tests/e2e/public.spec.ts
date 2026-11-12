import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

// Fresh IP per test so the 5/hour Join limit never trips across runs.
test.beforeEach(async ({ page }) => {
  const ip = `10.${rand()}.${rand()}.${rand()}`;
  await page.setExtraHTTPHeaders({ "x-real-ip": ip });
});
const rand = () => Math.floor(Math.random() * 250) + 1;

test("every public page responds 200 without console errors", async ({ page }) => {
  const paths = [
    "/", "/episodes", "/episodes/traffic-police-vs-taxi-drivers", "/artists", "/artists/betty-g", "/videos",
    "/gallery", "/gallery/studio-nights", "/news", "/news/welcome-to-the-new-home-of-feta-show", "/about", "/join", "/privacy",
  ];
  for (const p of paths) {
    const errors: string[] = [];
    page.removeAllListeners("console");
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(p);
    expect(res?.status(), p).toBe(200);
    await expect(page.locator("h1").first(), p).toBeVisible();
    expect(errors, p).toEqual([]);
  }
});

test("sitemap and robots", async ({ request }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  expect(sm).toContain("/episodes/lij-michael-vs-hanan-tarik");
  expect(sm).toContain("/artists/mulatu-astatke");
  expect(sm).not.toContain("/artists/lij-michael"); // draft
  expect(sm).not.toContain("casting-call"); // draft news
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
});

test("draft artists and draft news are not public", async ({ page }) => {
  expect((await page.goto("/artists/lij-michael"))?.status()).toBe(404);
  expect((await page.goto("/news/casting-call-go-head-to-head-on-feta"))?.status()).toBe(404);
});

test("episode contestants link only to published profiles", async ({ page }) => {
  await page.goto("/episodes/lij-michael-vs-hanan-tarik");
  const contestants = page.locator("section[aria-labelledby=contestants-title]");
  await expect(contestants.getByText("Lij Michael")).toBeVisible();
  await expect(contestants.getByRole("link")).toHaveCount(0); // both are drafts
  await expect(page.getByText("Episode video coming soon")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0); // no scores → no scoreboard
});

test("episode filters and contestant search", async ({ page }) => {
  await page.goto("/episodes?type=HOLIDAY_SPECIAL");
  await expect(page.getByRole("status").filter({ hasText: "result" })).toHaveText("1 result");
  await expect(page.getByRole("link", { name: "Traffic Police vs Taxi Drivers" })).toBeVisible();

  await gotoReady(page, "/episodes");
  await page.getByRole("searchbox", { name: "Search by contestant" }).fill("deribwork");
  await expect(page).toHaveURL(/q=deribwork/);
  await expect(page.getByRole("link", { name: "Mekonnen Laeke vs Deribwork" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "result" })).toHaveText("1 result");
});

test("artist directory filters", async ({ page }) => {
  await page.goto("/artists?category=COMEDIAN");
  await expect(page.locator("main ul.grid").getByRole("link", { name: /Seifu Fantahun/ })).toBeVisible();
  await page.goto("/artists?legends=1");
  await expect(page.getByRole("status").filter({ hasText: "result" })).toHaveText("6 results");
  await page.goto("/artists?onFeta=1");
  await expect(page.getByText("Profiles of Feta contestants are on their way.")).toBeVisible();
});

test("artist profile: facts, tabs and no On Feta tab when empty", async ({ page }) => {
  await page.goto("/artists/tilahun-gessesse");
  await expect(page.getByText("1940–2009")).toBeVisible();
  await gotoReady(page, "/artists/betty-g");
  await expect(page.getByText("Active since 2012")).toBeVisible();
  await expect(page.getByText("Bruktawit Getahun")).toBeVisible();
  const tabs = page.getByRole("tablist");
  await expect(tabs.getByRole("tab")).toHaveText(["Bio", "Notable works", "Videos", "Gallery"]);
  await tabs.getByRole("tab", { name: "Notable works" }).click();
  await expect(page.getByText("Manew Fitsum")).toBeVisible();
  await tabs.getByRole("tab", { name: "Videos" }).click();
  await expect(page.getByText("Videos coming soon")).toBeVisible();
});

test("command palette finds an artist and navigates", async ({ page }) => {
  await gotoReady(page, "/");
  const dialog = page.getByRole("dialog");
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("mulatu");
  await expect(dialog.getByRole("option", { name: /Mulatu Astatke/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/artists\/mulatu-astatke$/);
});

test("video modal shows a coming-soon state instead of a broken embed", async ({ page }) => {
  await gotoReady(page, "/videos?type=PERFORMANCE");
  await page.getByRole("button", { name: /Play SOH Dance Crew/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Video coming soon")).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveCount(0);
});

test("gallery lightbox opens with caption/credit", async ({ page }) => {
  await gotoReady(page, "/gallery/matchups");
  await page.getByRole("button", { name: /Open image/ }).first().click();
  await expect(page.getByText("Photo: Feta Show (generated artwork)").first()).toBeVisible();
});

test.describe("join forms", () => {
  test("validates Ethiopian phone numbers and consent", async ({ page }) => {
    await gotoReady(page, "/join?tab=audience");
    const panel = page.getByRole("tabpanel");
    await panel.getByLabel("Full name").fill("E2E Audience");
    await panel.getByLabel("Phone").fill("12345");
    await panel.getByRole("button", { name: "Send" }).click();
    await expect(panel.getByText("Enter an Ethiopian mobile number")).toBeVisible();
    await expect(panel.getByText("Please accept the privacy policy")).toBeVisible();
    await expect(panel.getByText("Choose a date.")).toBeVisible();
    // Fixing the phone clears its error as you type; it's stored as E.164 server-side.
    await panel.getByLabel("Phone").fill("07 1123 4567");
    await expect(panel.getByText("Enter an Ethiopian mobile number")).toBeHidden();
  });

  test("a contestant application is saved and shows success", async ({ page }) => {
    await gotoReady(page, "/join");
    const panel = page.getByRole("tabpanel");
    await panel.getByLabel("Full name").fill("E2E Contestant");
    await panel.getByLabel("Phone").fill("0911 234 567");
    await panel.getByLabel("Email").fill("e2e@example.com");
    await panel.getByLabel("City").fill("Addis Ababa");
    await panel.getByLabel("What do you do?").selectOption("COMEDIAN");
    await panel.getByLabel("Why you?").fill("I would bring a lot of energy to the Feta stage.");
    await panel.getByRole("checkbox").check();
    await panel.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status").getByText("You're in the queue!")).toBeVisible();
  });

  test("the honeypot silently drops bots", async ({ page }) => {
    await gotoReady(page, "/join?tab=sponsor");
    const panel = page.getByRole("tabpanel");
    await panel.getByLabel("Company").fill("E2E Bot Co");
    await panel.getByLabel("Contact name").fill("E2E Bot");
    await panel.getByLabel("Phone").fill("+251711234567");
    await panel.getByLabel("Email").fill("bot@example.com");
    await panel.getByLabel("Message").fill("Buy cheap things now please");
    await panel.getByRole("checkbox").check();
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "spam"));
    await page.locator('input[name="website"]').dispatchEvent("input");
    await panel.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status").getByText("You're in the queue!")).toBeVisible();
  });
});
