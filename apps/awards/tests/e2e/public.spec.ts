import { expect, test, type APIRequestContext } from "@playwright/test";
import { gotoReady, horizontalOverflow, waitHydrated } from "./helpers";

/**
 * Public site on the seeded sample edition (A-76: recognition, no voting).
 * Slugs come from the seed: edition = current EAT year, genre 1 = classical,
 * its first honoree = sample-artist-1a-sample.
 */
const year = () => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Addis_Ababa" }).format(new Date());
const HONOREE = "/honorees/sample-artist-1a-sample";

async function firstHref(request: APIRequestContext, prefix: string) {
  const items = (await (await request.get("/api/search")).json()) as { href: string }[];
  return items.find((i) => i.href.startsWith(prefix))!.href;
}

test("every public route answers 200", async ({ request }) => {
  const y = year();
  const artist = await firstHref(request, "/artists/");
  for (const url of ["/", `/awards/${y}`, `/awards/${y}/classical`, "/awards/archive", HONOREE, "/artists", artist, "/videos", "/gallery", "/gallery/red-carpet", "/news", "/about", "/privacy", "/terms", "/sign-in", "/sitemap.xml", "/robots.txt"]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
  }
});

test("voting and member pages are gone; missing and draft records are real 404s; /awards redirects", async ({ request }) => {
  for (const url of ["/vote", "/sign-up", "/verify", "/account", "/account/ballot", "/rules", `/awards/${year()}/winners`, "/nominees/sample-nominee-1a", "/api/vote", "/api/ballot-session"]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.status(), url).toBe(404);
  }
  for (const url of ["/awards/1999", `/awards/${year()}/no-such-genre`, "/honorees/no-such-honoree", "/artists/no-such-artist", "/gallery/no-such-album", "/news/honorees-announced", "/news/no-such-post", "/missing", "/no/such/page"]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.status(), url).toBe(404);
  }
  const res = await request.get("/awards", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(new RegExp(`/awards/${year()}$`));
});

test("home: genres, featured honorees, sample notice; no vote or sign-in controls", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.getByRole("heading", { name: "The genres" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Featured honorees" })).toBeVisible();
  await expect(page.getByText("Sample data: fictional artists").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "See the honorees" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^Vote/ })).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "Sign in" })).toHaveCount(0);
});

test("genre page lists every honoree equally, with citations", async ({ page }) => {
  await gotoReady(page, `/awards/${year()}/classical`);
  await expect(page.getByRole("heading", { level: 1, name: "Classical" })).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(4);
  await expect(page.getByText("4 honorees")).toBeVisible();
  await expect(page.getByText("Read the citation").first()).toBeVisible();
  await expect(page.getByText(/winner/i)).toHaveCount(0);
});

test("honoree page: genre, citation, featured work, artist profile link, share", async ({ page }) => {
  await gotoReady(page, HONOREE);
  await expect(page.getByRole("heading", { level: 1, name: "Sample Artist 1A" })).toBeVisible();
  await expect(page.getByText(`Classical · ${year()}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Citation" })).toBeVisible();
  await expect(page.getByText("Featured work: Sample Song 1A")).toBeVisible();
  await page.getByRole("link", { name: "Artist profile" }).click();
  await expect(page).toHaveURL(/\/artists\/sample-artist-1a$/);
});

test("artist profile lists the genres the artist is recognized in; real people are never honored by the sample", async ({ page }) => {
  await gotoReady(page, "/artists/sample-artist-1a");
  const tab = page.getByRole("tab", { name: "Feta Awards" });
  await waitHydrated(tab);
  await tab.click();
  await expect(page.getByRole("link", { name: new RegExp(`Classical · ${year()}`) })).toBeVisible();

  await gotoReady(page, "/artists/mulatu-astatke");
  await expect(page.getByText("Legend", { exact: true }).first()).toBeVisible();
  const tab2 = page.getByRole("tab", { name: "Feta Awards" });
  await waitHydrated(tab2);
  await tab2.click();
  await expect(page.getByText("Not yet honored at Feta Awards")).toBeVisible();
});

test("artists directory filters honored artists", async ({ page }) => {
  await gotoReady(page, "/artists?honored=1");
  await expect(page.getByRole("link", { name: "Feta Awards honorees" })).toHaveAttribute("aria-current", "true");
  // The legends rail above the directory isn't filtered; the directory grid is.
  const grid = page.locator("main ul.cv-auto");
  await expect(grid.getByText("Sample Artist 1A")).toBeVisible();
  await expect(grid.getByText("Mulatu Astatke")).toHaveCount(0);
});

test("videos filter by type", async ({ page }) => {
  await gotoReady(page, "/videos?type=RED_CARPET");
  await expect(page.getByRole("link", { name: "Red carpet" })).toHaveAttribute("aria-current", /.+/);
  await expect(page.getByRole("button", { name: /^Play / })).toHaveCount(1);
});

test("command palette finds honorees, artists and news", async ({ page }) => {
  await gotoReady(page, "/");
  const button = page.getByRole("button", { name: "Search honorees, artists and news" });
  await waitHydrated(button);
  await button.click();
  await page.getByPlaceholder("Search honorees, artists, news…").fill("sample song 1a");
  await expect(page.getByRole("option").first()).toContainText("Sample Artist 1A");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/honorees\/sample-artist-1a-sample$/);
});

for (const width of [360, 390, 1440]) {
  test(`no horizontal overflow on key pages @ ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/", `/awards/${year()}`, `/awards/${year()}/classical`, HONOREE, "/artists", "/artists/mulatu-astatke", "/gallery"]) {
      await gotoReady(page, url);
      expect(await horizontalOverflow(page), `${url} overflow`).toBeLessThanOrEqual(0);
    }
  });
}

test("SEO and security: metadata in <head>, share images, JSON-LD, headers", async ({ request }) => {
  const res = await request.get(HONOREE);
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toMatch(/<meta name="description" content="[^"]+"/);
  expect(head).toMatch(/<link rel="canonical" href="[^"]+\/honorees\//);
  const og = head.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  expect(og).toContain("/og/honoree/");
  expect(head).toContain('<meta name="twitter:card" content="summary_large_image"');
  const img = await request.get(new URL(og!).pathname);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/png");
  for (const u of ["/og/site", "/og/artist/mulatu-astatke", `/og/category/${year()}/classical`, `/og/edition/${year()}`]) expect((await request.get(u)).status(), u).toBe(200);
  expect((await request.get("/og/honoree/no-such-honoree")).status()).toBe(404);

  const home = await (await request.get("/")).text();
  const ld = [...home.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
  expect(ld.map((x) => x["@type"])).toContain("Organization");
  const artist = await (await request.get("/artists/mulatu-astatke")).text();
  expect(artist).toContain('"@type":"Person"');

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/awards/${year()}/classical`);
  expect(sitemap).toContain("/honorees/sample-artist-1a-sample");
  expect(sitemap).not.toMatch(/\/vote|\/rules|\/nominees\//);

  const h = res.headers();
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["content-security-policy"]).not.toContain("challenges.cloudflare.com");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
  const auth = await request.get("/sign-in");
  expect(auth.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
