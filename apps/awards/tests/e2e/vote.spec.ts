import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import pg from "pg";
import path from "node:path";
import { gotoReady, horizontalOverflow } from "./helpers";
import { latestCode } from "./mailpit";

/**
 * Gate 5: every §5.2 rule, enforced on the server. UI voting via the Server
 * Action; rule checks via POST /api/vote (same core) with real member sessions.
 * Edition/nominee tweaks are restored; e2e accounts, votes and events are removed.
 */
test.describe.configure({ mode: "serial" });

const DB = process.env.DATABASE_URL ?? "postgresql://feta:feta@localhost:5436/feta_awards";
const RUN = Date.now().toString(36);
const PASSWORD = "Gold-night-2026!";
const MEMBER_PASSWORD = process.env.SEED_MEMBER_PASSWORD ?? "Feta#Member2026";
const LEAK = [/"votes"\s*:/, /"_count"\s*:\s*\{\s*"votes"/, /totalVotes|publicShare|finalScore|juryScore/];

type Ids = { edition: { id: string; votingOpensAt: Date; votingClosesAt: Date }; cat1: { id: string; slug: string; nominees: { id: string; slug: string; name: string }[] }; cat2: { id: string; nominees: { id: string }[] }; jury: { id: string; nominees: { id: string }[] } };
let ids: Ids;

async function db<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

let ip = 0;
async function newContext(browser: Browser) {
  ip += 1;
  return browser.newContext({ extraHTTPHeaders: { "x-real-ip": `192.0.2.${(Number.parseInt(RUN.slice(-2), 36) + ip * 11) % 250}` } });
}

async function signUpVerified(page: Page, email: string) {
  const since = Date.now();
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("E2E Voter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email, /verification code/, since));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/vote$/);
}

async function signIn(page: Page, email: string, password: string) {
  await gotoReady(page, "/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

async function api(ctx: BrowserContext, body: { categoryId: string; nomineeId: string }, headers: Record<string, string> = {}) {
  const res = await ctx.request.post("/api/vote", { data: body, headers: { origin: "http://localhost:3201", ...headers } });
  return { status: res.status(), body: (await res.json()) as { ok: boolean; reason?: string; status?: string }, text: await res.text() };
}
async function openSession(ctx: BrowserContext) {
  const r = await ctx.request.post("/api/ballot-session", { data: { token: "" }, headers: { origin: "http://localhost:3201" } });
  return { status: r.status(), body: (await r.json()) as { ok: boolean; reason?: string } };
}

const emails = { a: `e2e+${RUN}-va@example.org`, b: `e2e+${RUN}-vb@example.org`, c: `e2e+${RUN}-vc@example.org` };

test.beforeAll(async () => {
  const [edition] = await db<Ids["edition"]>(`SELECT e.id, e."votingOpensAt", e."votingClosesAt" FROM "AwardEdition" e WHERE e."isSample" ORDER BY year DESC LIMIT 1`);
  const cats = await db<{ id: string; slug: string; votingType: string; sortOrder: number }>(`SELECT id, slug, "votingType", "sortOrder" FROM "AwardCategory" WHERE "editionId" = $1 ORDER BY "sortOrder"`, [edition!.id]);
  const nominees = async (categoryId: string) =>
    db<{ id: string; slug: string; name: string }>(`SELECT id, slug, "displayNameEn" AS name FROM "Nominee" WHERE "categoryId" = $1 ORDER BY "sortOrder"`, [categoryId]);
  const public1 = cats.filter((c) => c.votingType === "PUBLIC_VOTE");
  const jury = cats.find((c) => c.votingType === "JURY")!;
  ids = {
    edition: edition!,
    cat1: { id: public1[0]!.id, slug: public1[0]!.slug, nominees: await nominees(public1[0]!.id) },
    cat2: { id: public1[1]!.id, nominees: await nominees(public1[1]!.id) },
    jury: { id: jury.id, nominees: await nominees(jury.id) },
  };
});

test.afterAll(async () => {
  // Votes first (deleting a user would only detach them), then the append-only events via the allowed path, then the accounts.
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  await c.query(`DELETE FROM "Vote" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query("BEGIN");
  await c.query("SET LOCAL feta.allow_vote_event_delete = 'on'");
  await c.query(`DELETE FROM "VoteEvent" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query("COMMIT");
  await c.query(`DELETE FROM "ActivityLog" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await c.query(`DELETE FROM "user" WHERE email LIKE 'e2e+%@example.org'`);
  await c.query(`UPDATE "AwardEdition" SET phase = 'VOTING_OPEN', "votingOpensAt" = $2, "votingClosesAt" = $3 WHERE id = $1`, [ids.edition.id, ids.edition.votingOpensAt, ids.edition.votingClosesAt]);
  await c.query(`UPDATE "Nominee" SET status = 'PUBLISHED' WHERE "categoryId" = $1`, [ids.cat1.id]);
  await c.end();
});

test("vote in the UI, then change it: one vote, CAST + CHANGED events, share sheet, progress", async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signUpVerified(page, emails.a);
  const [n1, n2] = ids.cat1.nominees;

  const [edition] = await db<{ slug: string }>(`SELECT slug FROM "AwardEdition" WHERE id = $1`, [ids.edition.id]);
  await gotoReady(page, `/awards/${edition!.slug}/${ids.cat1.slug}`);
  const voteFor = (name: string) => page.getByRole("button", { name: `Vote for ${name}` });
  const yourVote = (name: string) => page.getByRole("button", { name: `Your vote: ${name}` });
  await voteFor(n1!.name).click();
  await expect(yourVote(n1!.name)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: `You voted for ${n1!.name} in` })).toBeVisible();
  await expect(page.getByRole("region", { name: "Share" }).getByRole("link", { name: "Share: Telegram" })).toBeVisible();

  await voteFor(n2!.name).click();
  await expect(yourVote(n2!.name)).toBeVisible();
  await expect(voteFor(n1!.name)).toBeVisible(); // the vote moved

  // Gate 5 screenshots: selected card + share sheet after a vote.
  const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.addStyleTag({ content: "[data-dev-tools]{display:none!important}" });
    await yourVote(n2!.name).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${OUT}/p5-voted-${width}.png` });
  }

  const votes = await db<{ nomineeId: string }>(`SELECT v."nomineeId" FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email = $1 AND v."categoryId" = $2`, [emails.a, ids.cat1.id]);
  expect(votes).toEqual([{ nomineeId: n2!.id }]);
  const events = await db<{ type: string; fromNomineeId: string | null; toNomineeId: string; ipHash: string }>(
    `SELECT type, "fromNomineeId", "toNomineeId", "ipHash" FROM "VoteEvent" e JOIN "user" u ON u.id = e."userId" WHERE u.email = $1 ORDER BY e."createdAt"`,
    [emails.a],
  );
  expect(events.map((e) => [e.type, e.fromNomineeId, e.toNomineeId])).toEqual([
    ["CAST", null, n1!.id],
    ["CHANGED", n1!.id, n2!.id],
  ]);
  expect(events[0]!.ipHash).toMatch(/^[0-9a-f]{64}$/); // HMAC, never the raw IP

  await gotoReady(page, "/vote");
  await expect(page.getByText(/You've voted in 1 of 10 categories/).first()).toBeVisible();
  await ctx.close();
});

test("repeat vote for the same nominee changes nothing; the ballot session is required and bound to the member", async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signIn(page, emails.a, PASSWORD);
  const n2 = ids.cat1.nominees[1]!;
  // New browser context = no ballot cookie yet.
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: n2.id })).toMatchObject({ status: 401, body: { ok: false, reason: "BALLOT_SESSION" } });
  expect((await openSession(ctx)).status).toBe(200);
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: n2.id })).toMatchObject({ status: 200, body: { ok: true, status: "unchanged" } });
  const n = await db<{ n: number }>(`SELECT count(*)::int AS n FROM "VoteEvent" e JOIN "user" u ON u.id = e."userId" WHERE u.email = $1`, [emails.a]);
  expect(n[0]!.n).toBe(2);

  // Another member can't use A's ballot cookie.
  const ballot = (await ctx.cookies()).find((c) => c.name === "feta_ballot")!;
  const other = await newContext(browser);
  const op = await other.newPage();
  await signUpVerified(op, emails.c);
  await other.addCookies([{ ...ballot }]);
  expect(await api(other, { categoryId: ids.cat1.id, nomineeId: n2.id })).toMatchObject({ status: 401, body: { reason: "BALLOT_SESSION" } });
  await other.close();
  await ctx.close();
});

test("rules: wrong category, jury category, unpublished nominee, outside the window, phase not open", async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signIn(page, emails.a, PASSWORD);
  await openSession(ctx);
  const n = ids.cat1.nominees;

  expect(await api(ctx, { categoryId: ids.cat2.id, nomineeId: n[0]!.id })).toMatchObject({ status: 422, body: { reason: "WRONG_CATEGORY" } });
  expect(await api(ctx, { categoryId: ids.jury.id, nomineeId: ids.jury.nominees[0]!.id })).toMatchObject({ status: 422, body: { reason: "NOT_VOTABLE" } });
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: "nope-not-a-real-id" })).toMatchObject({ status: 404, body: { reason: "NOMINEE_UNAVAILABLE" } });

  await db(`UPDATE "Nominee" SET status = 'DRAFT' WHERE id = $1`, [n[4]!.id]);
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: n[4]!.id })).toMatchObject({ status: 404, body: { reason: "NOMINEE_UNAVAILABLE" } });
  await db(`UPDATE "Nominee" SET status = 'PUBLISHED' WHERE id = $1`, [n[4]!.id]);

  await db(`UPDATE "AwardEdition" SET "votingClosesAt" = now() - interval '1 minute' WHERE id = $1`, [ids.edition.id]);
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: n[0]!.id })).toMatchObject({ status: 409, body: { reason: "OUTSIDE_WINDOW" } });
  await db(`UPDATE "AwardEdition" SET "votingOpensAt" = now() + interval '1 minute', "votingClosesAt" = $2 WHERE id = $1`, [ids.edition.id, ids.edition.votingClosesAt]);
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: n[0]!.id })).toMatchObject({ status: 409, body: { reason: "OUTSIDE_WINDOW" } });
  await db(`UPDATE "AwardEdition" SET "votingOpensAt" = $2, phase = 'VOTING_CLOSED' WHERE id = $1`, [ids.edition.id, ids.edition.votingOpensAt]);
  expect(await api(ctx, { categoryId: ids.cat1.id, nomineeId: n[0]!.id })).toMatchObject({ status: 409, body: { reason: "NOT_OPEN" } });
  await db(`UPDATE "AwardEdition" SET phase = 'VOTING_OPEN' WHERE id = $1`, [ids.edition.id]);

  // Nothing above changed A's vote.
  const votes = await db<{ nomineeId: string }>(`SELECT v."nomineeId" FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email = $1`, [emails.a]);
  expect(votes).toEqual([{ nomineeId: n[1]!.id }]);
  await ctx.close();
});

test("rules: signed out, cross-site, unverified and banned members can't vote", async ({ browser, playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: "http://localhost:3201" });
  const r = await anon.post("/api/vote", { data: { categoryId: ids.cat1.id, nomineeId: ids.cat1.nominees[0]!.id }, headers: { origin: "http://localhost:3201" } });
  expect(r.status()).toBe(401);
  expect(await r.json()).toMatchObject({ reason: "SIGNED_OUT" });
  const x = await anon.post("/api/vote", { data: { categoryId: ids.cat1.id, nomineeId: ids.cat1.nominees[0]!.id }, headers: { origin: "https://evil.example" } });
  expect(x.status()).toBe(403);
  await anon.dispose();

  const unverified = await newContext(browser);
  await signIn(await unverified.newPage(), "member3@example.com", MEMBER_PASSWORD);
  expect(await openSession(unverified)).toMatchObject({ status: 403, body: { reason: "UNVERIFIED_EMAIL" } });
  expect(await api(unverified, { categoryId: ids.cat1.id, nomineeId: ids.cat1.nominees[0]!.id })).toMatchObject({ status: 403, body: { reason: "UNVERIFIED_EMAIL" } });
  await unverified.close();

  const banned = await newContext(browser);
  await signUpVerified(await banned.newPage(), emails.b);
  expect((await openSession(banned)).status).toBe(200);
  await db(`UPDATE "user" SET banned = true, "banReason" = 'e2e' WHERE email = $1`, [emails.b]);
  expect(await api(banned, { categoryId: ids.cat1.id, nomineeId: ids.cat1.nominees[0]!.id })).toMatchObject({ status: 403, body: { reason: "BANNED" } });
  const none = await db<{ n: number }>(`SELECT count(*)::int AS n FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email = $1`, [emails.b]);
  expect(none[0]!.n).toBe(0);
  await banned.close();
});

test("concurrent votes from one member never create a second vote; rate limit 20/min per member", async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signIn(page, emails.c, PASSWORD);
  await openSession(ctx);
  const n = ids.cat2.nominees;
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => api(ctx, { categoryId: ids.cat2.id, nomineeId: n[i % n.length]!.id })));
  expect(results.every((r) => r.status === 200)).toBe(true);
  const rows = await db<{ n: number }>(`SELECT count(*)::int AS n FROM "Vote" v JOIN "user" u ON u.id = v."userId" WHERE u.email = $1 AND v."categoryId" = $2`, [emails.c, ids.cat2.id]);
  expect(rows[0]!.n).toBe(1);
  const ev = await db<{ type: string; n: number }>(`SELECT type, count(*)::int AS n FROM "VoteEvent" e JOIN "user" u ON u.id = e."userId" WHERE u.email = $1 GROUP BY type`, [emails.c]);
  expect(ev.find((e) => e.type === "CAST")?.n).toBe(1);

  // 10 used; the 21st action in the minute is refused.
  const more = [];
  for (let i = 0; i < 11; i++) more.push(await api(ctx, { categoryId: ids.cat2.id, nomineeId: n[i % n.length]!.id }));
  expect(more.slice(0, 10).every((r) => r.status === 200)).toBe(true);
  expect(more[10]).toMatchObject({ status: 429, body: { reason: "RATE_LIMITED" } });
  await ctx.close();
});

test("no response leaks counts: vote API, member ballot pages (HTML + RSC)", async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signIn(page, emails.a, PASSWORD);
  await openSession(ctx);
  const res = await api(ctx, { categoryId: ids.cat1.id, nomineeId: ids.cat1.nominees[1]!.id });
  expect(Object.keys(res.body).sort()).toEqual(["categoryId", "nomineeId", "ok", "status"]);
  for (const url of ["/", "/vote", "/account/ballot", `/nominees/${ids.cat1.nominees[0]!.slug}`]) {
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const body = await (await ctx.request.get(url, { headers })).text();
      for (const re of LEAK) expect(body, `${url} ${JSON.stringify(headers)}`).not.toMatch(re);
    }
  }
  await ctx.close();
});
