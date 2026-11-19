import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";
import { gotoReady, horizontalOverflow, settle } from "./helpers";

/**
 * Phase-dependent behaviour + Gate 3 screenshots. Runs serially in its own
 * project (it flips the shared sample edition) and always restores VOTING_OPEN.
 */
test.describe.configure({ mode: "serial" });

const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");
const year = () => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Addis_Ababa" }).format(new Date());

async function setPhase(request: APIRequestContext, phase: string) {
  const res = await request.post("/api/dev/phase", { data: { phase } });
  expect(res.status(), `switch to ${phase}`).toBe(200);
}

async function shoot(page: Page, name: string, url: string) {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await gotoReady(page, url);
    await page.addStyleTag({ content: "[data-dev-tools]{display:none!important}" });
    await settle(page);
    expect(await horizontalOverflow(page), `${name} @ ${width}`).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${OUT}/p3-${name}-${width}.png`, fullPage: true });
  }
}

test.afterAll(async ({ request }) => {
  await setPhase(request, "VOTING_OPEN");
});

test("Gate 3 screenshots: voting open", async ({ page, request }) => {
  test.setTimeout(240_000);
  await setPhase(request, "VOTING_OPEN");
  const items = (await (await request.get("/api/search")).json()) as { href: string }[];
  const nominee = items.find((i) => i.href.startsWith("/nominees/"))!.href;
  await shoot(page, "home-voting-open", "/");
  await shoot(page, "category", `/awards/${year()}/best-male-artist`);
  await shoot(page, "nominee", nominee);
  await shoot(page, "ballot-signed-out", "/vote");
  await shoot(page, "artists", "/artists");
  await shoot(page, "legend-artist", "/artists/mulatu-astatke");
  await shoot(page, "gallery", "/gallery");
});

test("winners announced: foil winners on home and winners page, percentages from the snapshot", async ({ page, request }) => {
  test.setTimeout(120_000);
  await setPhase(request, "WINNERS_ANNOUNCED");
  await gotoReady(page, "/");
  await expect(page.getByRole("status").filter({ hasText: "Winners announced" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The winners" })).toBeVisible();
  await gotoReady(page, `/awards/${year()}/winners`);
  // 12 categories, each with exactly one winner.
  await expect(page.locator("main li a.foil-frame")).toHaveCount(12);
  await expect(page.getByText("of the public vote").first()).toBeVisible();
  // Category page: exactly one winner card, no vote controls.
  await gotoReady(page, `/awards/${year()}/best-male-artist`);
  await expect(page.locator("article.foil-frame")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /^Sign in to vote/ })).toHaveCount(0);
  await shoot(page, "home-winners", "/");
  await shoot(page, "winners", `/awards/${year()}/winners`);
});

test("voting closed and nominees announced states", async ({ page, request }) => {
  await setPhase(request, "VOTING_CLOSED");
  await gotoReady(page, "/vote");
  await expect(page.getByRole("heading", { name: "Voting has closed" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Sign in to vote/ })).toHaveCount(0);
  // Winners are not public before they're announced.
  await gotoReady(page, `/awards/${year()}/winners`);
  await expect(page.getByText("Winners will be announced on awards night")).toBeVisible();

  await setPhase(request, "NOMINEES_ANNOUNCED");
  await gotoReady(page, "/vote");
  await expect(page.getByRole("heading", { name: "Voting isn't open yet" })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Vote", exact: true })).toHaveCount(0);
});

test("draft edition hides categories and nominees (real 404s)", async ({ page, request }) => {
  const items = (await (await request.get("/api/search")).json()) as { href: string }[];
  const nominee = items.find((i) => i.href.startsWith("/nominees/"))!.href;
  await setPhase(request, "DRAFT");
  expect((await request.get(nominee)).status()).toBe(404);
  expect((await request.get(`/awards/${year()}/best-male-artist`)).status()).toBe(404);
  const search = (await (await request.get("/api/search")).json()) as { href: string }[];
  expect(search.some((i) => i.href.startsWith("/nominees/"))).toBe(false);
  await gotoReady(page, "/");
  await expect(page.getByRole("heading", { name: "Nominees will be announced soon" })).toBeVisible();
});
