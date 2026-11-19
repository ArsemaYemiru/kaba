import { expect, test, type APIRequestContext } from "@playwright/test";
import { gotoReady, horizontalOverflow, waitHydrated } from "./helpers";

/**
 * Phase 3 public site on the seeded sample edition (VOTING_OPEN).
 * Slugs come from the seed: edition = current EAT year, category 1 = best-male-artist.
 */
const year = () => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Addis_Ababa" }).format(new Date());

async function firstHref(request: APIRequestContext, prefix: string) {
  const items = (await (await request.get("/api/search")).json()) as { href: string }[];
  return items.find((i) => i.href.startsWith(prefix))!.href;
}

test("every public route answers 200", async ({ request }) => {
  const y = year();
  const nominee = await firstHref(request, "/nominees/");
  const artist = await firstHref(request, "/artists/");
  for (const url of ["/", `/awards/${y}`, `/awards/${y}/best-male-artist`, `/awards/${y}/winners`, "/awards/archive", "/vote", nominee, "/artists", artist, "/videos", "/gallery", "/gallery/red-carpet", "/news", "/about", "/rules", "/privacy", "/terms", "/sitemap.xml", "/robots.txt"]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
  }
});

test("missing, draft and unannounced records are real 404s; /awards redirects", async ({ request }) => {
  for (const url of ["/awards/1999", `/awards/${year()}/no-such-category`, "/nominees/no-such-nominee", "/artists/no-such-artist", "/gallery/no-such-album", "/news/nominees-announced", "/news/no-such-post", "/missing", "/no/such/page"]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.status(), url).toBe(404);
  }
  const res = await request.get("/awards", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(new RegExp(`/awards/${year()}$`));
});

test("home is phase-aware: voting open banner, countdown, categories, sample notice", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.getByRole("status").filter({ hasText: "Voting is open" })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Vote", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to vote" })).toBeVisible();
  await expect(page.getByText("Sample data: fictional names").first()).toBeVisible();
  // Hero countdown to "Voting closes" ticks on the client.
  await expect(page.locator("section[aria-labelledby=hero-title]").getByText("Voting closes", { exact: true })).toBeVisible();
  await expect(page.locator("section[aria-labelledby=hero-title] ol").first()).not.toContainText("––");
});

test("category page lists nominees with sign-in-to-vote while signed out", async ({ page }) => {
  await gotoReady(page, `/awards/${year()}/best-male-artist`);
  await expect(page.getByRole("heading", { level: 1, name: "Best Male Artist" })).toBeVisible();
  const cards = page.locator("article");
  await expect(cards).toHaveCount(5);
  await expect(page.getByRole("link", { name: /^Sign in to vote: / })).toHaveCount(5);
  await expect(page.getByText("Decided by the public vote")).toBeVisible();
  const href = await page.getByRole("link", { name: /^Sign in to vote: / }).first().getAttribute("href");
  expect(href).toBe("/sign-in?next=%2Fvote%23best-male-artist");
});

test("signed-out ballot: sign-in prompt, only public-vote categories, progress 0", async ({ page }) => {
  await gotoReady(page, "/vote");
  await expect(page.getByRole("heading", { name: "Sign in to vote" })).toBeVisible();
  await expect(page.getByText(/You've voted in 0 of 10 categories/)).toBeVisible();
  // Jury and honorary categories are not on the ballot.
  await expect(page.locator("section[id] h2")).toHaveCount(10);
});

test("nominee page shows category, sample chip and share", async ({ page, request }) => {
  await gotoReady(page, await firstHref(request, "/nominees/"));
  await expect(page.getByText(/^Nominee · /)).toBeVisible();
  await expect(page.getByText("Sample", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to vote" })).toBeVisible();
});

test("artists: legend profile has a Feta Awards tab; real people are never nominees", async ({ page }) => {
  await gotoReady(page, "/artists?nominees=1");
  await expect(page.getByText("Artists linked to Feta Awards nominations will appear here.")).toBeVisible();
  await gotoReady(page, "/artists/mulatu-astatke");
  await expect(page.getByText("Legend", { exact: true }).first()).toBeVisible();
  const tab = page.getByRole("tab", { name: "Feta Awards" });
  await waitHydrated(tab);
  await tab.click();
  await expect(page.getByText("No Feta Awards nominations yet")).toBeVisible();
});

test("videos filter by type", async ({ page }) => {
  await gotoReady(page, "/videos?type=RED_CARPET");
  await expect(page.getByRole("link", { name: "Red carpet" })).toHaveAttribute("aria-current", /.+/);
  await expect(page.getByRole("button", { name: /^Play / })).toHaveCount(1);
});

test("command palette finds nominees, artists and news", async ({ page }) => {
  await gotoReady(page, "/");
  const button = page.getByRole("button", { name: "Search nominees, artists and news" });
  await waitHydrated(button);
  await button.click();
  await page.getByPlaceholder("Search nominees, artists, news…").fill("sample nominee 1a");
  await expect(page.getByRole("option").first()).toContainText("Sample Nominee 1A");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/nominees\/sample-nominee-1a$/);
});

test("public responses never contain vote counts", async ({ request }) => {
  const y = year();
  const nominee = await firstHref(request, "/nominees/");
  for (const url of ["/", "/vote", `/awards/${y}`, `/awards/${y}/best-male-artist`, nominee, "/api/search", "/sitemap.xml"]) {
    const body = await (await request.get(url, { headers: { RSC: "1" } })).text();
    const html = await (await request.get(url)).text();
    for (const text of [body, html]) {
      expect(text, url).not.toMatch(/"votes"\s*:/);
      expect(text, url).not.toMatch(/"_count"\s*:\s*\{\s*"votes"/);
      expect(text, url).not.toMatch(/totalVotes|publicShare|finalScore|juryScore/);
    }
  }
});

for (const width of [360, 390, 1440]) {
  test(`no horizontal overflow on key pages @ ${width}px`, async ({ page, request }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/", `/awards/${year()}/best-male-artist`, "/vote", await firstHref(request, "/nominees/"), "/artists", "/artists/mulatu-astatke", "/gallery"]) {
      await gotoReady(page, url);
      expect(await horizontalOverflow(page), `${url} overflow`).toBeLessThanOrEqual(0);
    }
  });
}

test("SEO and security: metadata in <head>, share images, JSON-LD, headers (Gate 7)", async ({ request }) => {
  const nominee = await firstHref(request, "/nominees/");
  const res = await request.get(nominee);
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toMatch(/<meta name="description" content="[^"]+"/);
  expect(head).toMatch(/<link rel="canonical" href="[^"]+\/nominees\//);
  const og = head.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  expect(og).toContain("/og/nominee/");
  expect(head).toContain('<meta name="twitter:card" content="summary_large_image"');
  const img = await request.get(new URL(og!).pathname);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/png");
  for (const u of ["/og/site", "/og/artist/mulatu-astatke", `/og/category/${year()}/best-male-artist`, `/og/edition/${year()}`]) expect((await request.get(u)).status(), u).toBe(200);
  expect((await request.get("/og/nominee/no-such-nominee")).status()).toBe(404);

  const home = await (await request.get("/")).text();
  const ld = [...home.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
  expect(ld.map((x) => x["@type"])).toContain("Organization");
  const artist = await (await request.get("/artists/mulatu-astatke")).text();
  expect(artist).toContain('"@type":"Person"');

  const h = res.headers();
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
  const auth = await request.get("/sign-in");
  expect(auth.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(auth.headers()["content-security-policy"]).toContain("object-src 'none'");
});
