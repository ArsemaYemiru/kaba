import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { gotoReady, horizontalOverflow, settle, waitHydrated } from "./helpers";
import { latestCode } from "./mailpit";
import { totp } from "./totp";

/**
 * Gate 4: sign up → code from Mailpit → verify → sign in; members get 403 on
 * /admin by URL and by Server Action; unverified members can't vote.
 * Accounts created here use the e2e+…@example.org pattern and are deleted after.
 */
test.describe.configure({ mode: "serial" });

const DB = process.env.DATABASE_URL ?? "postgresql://feta:feta@localhost:5436/feta_awards";
const RUN = Date.now().toString(36);
const NEW_EMAIL = `e2e+${RUN}@example.org`;
const PASSWORD = "Gold-night-2026!";
const MEMBER_PASSWORD = process.env.SEED_MEMBER_PASSWORD ?? "Feta#Member2026";
let ipCounter = 0;

/** Each test gets its own client IP so the per-IP limits never collide between runs. */
test.beforeEach(async ({ context }) => {
  ipCounter += 1;
  await context.setExtraHTTPHeaders({ "x-real-ip": `198.51.100.${(Number.parseInt(RUN.slice(-2), 36) + ipCounter * 7) % 250}` });
});

test.afterAll(async () => {
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  await client.query(`DELETE FROM "Vote" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await client.query(`DELETE FROM "ActivityLog" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE 'e2e+%@example.org')`);
  await client.query(`DELETE FROM "user" WHERE email LIKE 'e2e+%@example.org'`);
  await client.end();
});

async function signIn(page: Page, email: string, password: string, next?: string) {
  await gotoReady(page, next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

function actionId(name: string, file: string) {
  const manifest = JSON.parse(readFileSync(path.resolve(__dirname, "../../.next/server/server-reference-manifest.json"), "utf8")) as {
    node: Record<string, { exportedName?: string; filename?: string }>;
  };
  const hit = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && v.filename?.endsWith(file));
  if (!hit) throw new Error(`action ${name} not found`);
  return hit[0];
}

test("sign up → read the code from Mailpit → verify → ballot unlocked", async ({ page }) => {
  const since = Date.now();
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("E2E Fan");
  await page.getByLabel("Email").fill(NEW_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  // Consent is required (server-side check); the typed values survive the error.
  await expect(page.getByText("You need to accept the voting rules and privacy policy.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(NEW_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify\?next=%2Fvote$/);
  await expect(page.getByText(`We sent a 6-digit code to ${NEW_EMAIL}`)).toBeVisible();
  const code = await latestCode(NEW_EMAIL, /verification code/, since);
  await page.getByLabel("6-digit code").fill(code === "000000" ? "111111" : String((Number(code) + 1) % 1_000_000).padStart(6, "0"));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.getByText("That code isn't right.")).toBeVisible();
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Verify email" }).click();

  await expect(page).toHaveURL(/\/vote$/);
  await expect(page.getByRole("heading", { name: "Your ballot" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Vote for / }).first()).toBeVisible();

  // The database agrees: a verified MEMBER with consent recorded.
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  const { rows } = await client.query(`SELECT role, "emailVerified", "consentAt", "emailNormalized" FROM "user" WHERE email = $1`, [NEW_EMAIL]);
  await client.end();
  expect(rows[0]).toMatchObject({ role: "MEMBER", emailVerified: true, emailNormalized: NEW_EMAIL });
  expect(rows[0].consentAt).not.toBeNull();
});

test("sign out, then sign in again (wrong password keeps the email)", async ({ page }) => {
  await signIn(page, NEW_EMAIL, "wrong-password-123", "/account");
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(NEW_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("header").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("password reset by email code", async ({ page }) => {
  const since = Date.now();
  await gotoReady(page, "/forgot-password");
  await page.getByLabel("Email").fill(NEW_EMAIL);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page).toHaveURL(/\/reset-password\?email=/);
  const code = await latestCode(NEW_EMAIL, /password reset code/, since);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByLabel("New password", { exact: true }).fill(`${PASSWORD}x`);
  await page.getByLabel("Confirm new password").fill(`${PASSWORD}x`);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=1$/);
  await signIn(page, NEW_EMAIL, `${PASSWORD}x`);
  await expect(page).toHaveURL(/\/$/);
});

test("sign-up rules: disposable emails, duplicates (Gmail-normalized) and roles can't be forced", async ({ page, request }) => {
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("Throwaway");
  await page.getByLabel("Email").fill(`e2e+${RUN}@mailinator.com`);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Disposable email addresses can't be used.")).toBeVisible();

  // Same inbox, different spelling → refused.
  await page.getByLabel("Email").fill(NEW_EMAIL.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account already exists for this email.")).toBeVisible();

  // The raw Better Auth sign-up endpoint isn't public (A-45), so a role can't be posted to it.
  const res = await request.post("/api/auth/sign-up/email", { data: { email: `e2e+${RUN}-role@example.org`, password: PASSWORD, name: "x", role: "SUPER_ADMIN" } });
  expect(res.status()).toBe(404);
});

test("unverified member can browse but can't vote", async ({ page }) => {
  await signIn(page, "member3@example.com", MEMBER_PASSWORD, "/vote");
  // Unverified members land on /verify first and may skip it.
  await expect(page).toHaveURL(/\/verify\?next=%2Fvote$/);
  await page.getByRole("link", { name: /Skip for now/ }).click();
  await expect(page).toHaveURL(/\/vote$/);
  await expect(page.getByRole("heading", { name: "Verify your email to vote" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Verify to vote: / }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Vote for / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Sign in to vote/ })).toHaveCount(0);
});

test("a member gets 403 on /admin by URL and by Server Action", async ({ page }) => {
  await signIn(page, "member1@example.com", MEMBER_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  // Seeded votes show up as the member's own picks.
  await gotoReady(page, "/account/ballot");
  await expect(page.getByText(/You've voted in 4 of 10 categories/)).toBeVisible();

  const res = await page.goto("/admin");
  expect(res?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "403 · Not allowed" })).toBeVisible();

  // Call the staff-only action directly (by its id), as an attacker would, from a public page.
  const id = actionId("refreshPublicContent", "src/server/actions/admin/security.ts");
  for (const url of ["/", "/admin"]) {
    const r = await page.request.post(url, { headers: { "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" }, data: "[]" });
    expect(r.status(), `action via ${url}`).toBe(403);
  }
  // Nothing was logged as done.
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM "ActivityLog" a JOIN "user" u ON u.id = a."userId" WHERE u.email = 'member1@example.com' AND a.action = 'cache_refresh'`);
  await client.end();
  expect(rows[0].n).toBe(0);
});

test("staff: one sign-in page, forced password change first; signed-out admin goes to sign-in", async ({ page, request }) => {
  const r = await request.get("/admin/security", { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers().location).toContain("/sign-in?next=%2Fadmin%2Fsecurity");
  const login = await request.get("/admin/login", { maxRedirects: 0 });
  expect(login.headers().location).toContain("/sign-in?next=/admin");

  await signIn(page, process.env.SEED_EDITOR_EMAIL ?? "editor@fetaawards.com", process.env.SEED_EDITOR_PASSWORD ?? "Feta#Editor2026", "/admin");
  // The seeded editor still has mustChangePassword (never changed here, so the dev login keeps working).
  await expect(page).toHaveURL(/\/admin\/change-password$/);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  const blocked = await page.goto("/admin/security");
  expect(blocked?.url()).toMatch(/\/admin\/change-password$/);
});

test("staff two-factor: set up with an authenticator, then sign in with a code", async ({ page }) => {
  test.setTimeout(60_000);
  // A throwaway account promoted to EDITOR (the seeded staff logins are never modified by tests).
  const email = `e2e+${RUN}-staff@example.org`;
  const since = Date.now();
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("E2E Editor");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email, /verification code/, since));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/vote$/);
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  await client.query(`UPDATE "user" SET role = 'EDITOR' WHERE email = $1`, [email]);
  await client.end();

  await page.goto("/admin/security");
  await waitHydrated(page.getByRole("button", { name: "Set up two-factor" }));
  await page.getByLabel("Confirm your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Set up two-factor" }).click();
  await expect(page.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
  const secret = (await page.locator("button .font-mono").textContent())!.trim();
  await expect(page.getByRole("list", { name: "Backup codes" }).getByRole("listitem")).toHaveCount(10);
  await page.getByLabel("Code from your app").fill(totp(secret));
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await expect(page.getByText("Two-factor authentication is on.")).toBeVisible();

  await page.getByRole("button", { name: /^Account menu for / }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await signIn(page, email, PASSWORD, "/admin");
  await expect(page).toHaveURL(/\/two-factor\?next=%2Fadmin$/);
  await page.getByLabel("Authentication code").fill("000000" === totp(secret) ? "111111" : "000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("That code isn't right.")).toBeVisible();
  await page.getByLabel("Authentication code").fill(totp(secret));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Selam/ })).toBeVisible();
});

test("account: change password, verify a phone, delete the account (open-edition votes go, audit events stay)", async ({ page }) => {
  test.setTimeout(60_000);
  const email = `e2e+${RUN}-acct@example.org`;
  const since = Date.now();
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Display name").fill("E2E Account");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("6-digit code").fill(await latestCode(email, /verification code/, since));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/vote$/);

  await gotoReady(page, "/account");
  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByLabel("New password", { exact: true }).fill(`${PASSWORD}y`);
  await page.getByLabel("Confirm new password").fill(`${PASSWORD}y`);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed. Other devices were signed out.")).toBeVisible();

  // Phone OTP (console SMS driver in dev): read the code the server stored.
  const local = `09${String(Date.now()).slice(-8)}`;
  const e164 = `+251${local.slice(1)}`;
  await page.getByLabel("Mobile number").fill(local);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(`We sent a code to ${e164}.`)).toBeVisible();
  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  const otp = await client.query(`SELECT value FROM verification WHERE identifier LIKE $1 ORDER BY "createdAt" DESC LIMIT 1`, [`%${e164}%`]);
  await page.getByLabel("SMS code").fill(String(otp.rows[0].value).split(":")[0]!);
  await page.getByRole("button", { name: "Verify number" }).click();
  await expect(page.getByText("Your phone number is verified.")).toBeVisible();

  // Give the member a vote + audit event in the open edition, then delete the account.
  const ids = await client.query(
    `SELECT u.id AS "userId", c.id AS "categoryId", c."editionId", n.id AS "nomineeId"
       FROM "user" u, "AwardCategory" c JOIN "AwardEdition" e ON e.id = c."editionId" AND e.phase = 'VOTING_OPEN'
       JOIN "Nominee" n ON n."categoryId" = c.id
      WHERE u.email = $1 AND c."votingType" = 'PUBLIC_VOTE' ORDER BY c."sortOrder", n."sortOrder" LIMIT 1`,
    [email],
  );
  const r = ids.rows[0];
  await client.query(`INSERT INTO "Vote" (id, "userId", "editionId", "categoryId", "nomineeId", "ipHash", "uaHash", "updatedAt") VALUES ($1, $2, $3, $4, $5, 'e2e', 'e2e', now())`, [`e2e${RUN}v`, r.userId, r.editionId, r.categoryId, r.nomineeId]);
  await client.query(`INSERT INTO "VoteEvent" (id, "userId", "editionId", "categoryId", "toNomineeId", type, "ipHash", "uaHash") VALUES ($1, $2, $3, $4, $5, 'CAST', 'e2e', 'e2e')`, [`e2e${RUN}ev`, r.userId, r.editionId, r.categoryId, r.nomineeId]);

  await page.getByLabel("Password", { exact: true }).fill(`${PASSWORD}y`);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?accountDeleted=1$/);

  const after = await client.query(
    `SELECT (SELECT count(*)::int FROM "user" WHERE email = $1) AS users,
            (SELECT count(*)::int FROM "Vote" WHERE id = $2) AS votes,
            (SELECT "userId" FROM "VoteEvent" WHERE id = $3) AS "eventUser",
            (SELECT count(*)::int FROM "VoteEvent" WHERE id = $3) AS events`,
    [email, `e2e${RUN}v`, `e2e${RUN}ev`],
  );
  // The audit event is kept for the trail but no longer points at a person; clean it up via the allowed path.
  await client.query(`BEGIN; SET LOCAL feta.allow_vote_event_delete = 'on'; DELETE FROM "VoteEvent" WHERE id = '${`e2e${RUN}ev`}'; COMMIT;`);
  await client.end();
  expect(after.rows[0]).toEqual({ users: 0, votes: 0, eventUser: null, events: 1 });
});

test("account pages are private and never cached", async ({ request }) => {
  for (const url of ["/sign-in", "/sign-up", "/verify", "/account"]) {
    const r = await request.get(url, { maxRedirects: 0 });
    expect(r.headers()["cache-control"], url).toBe("private, no-store");
    expect(r.headers()["content-security-policy"], url).toContain("frame-ancestors 'none'");
  }
});

test("Gate 4 screenshots", async ({ browser }) => {
  test.setTimeout(180_000);
  const OUT = path.resolve(__dirname, "../../../../docs/awards/screens");
  const shots: { name: string; url: string; as?: string }[] = [
    { name: "sign-up", url: "/sign-up" },
    { name: "sign-in", url: "/sign-in" },
    { name: "verify", url: "/verify", as: "member3@example.com" },
    { name: "ballot-unverified", url: "/vote", as: "member3@example.com" },
    { name: "account", url: "/account", as: "member1@example.com" },
    { name: "my-ballot", url: "/account/ballot", as: "member1@example.com" },
    { name: "admin-403", url: "/admin", as: "member1@example.com" },
  ];
  for (const width of [390, 1440]) {
    for (const who of [undefined, "member3@example.com", "member1@example.com"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { "x-real-ip": `203.0.113.${width === 390 ? 10 : 20}` } });
      const page = await context.newPage();
      if (who) {
        await signIn(page, who, MEMBER_PASSWORD);
        await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
      }
      for (const s of shots.filter((x) => x.as === who)) {
        if (s.name === "admin-403") await page.goto(s.url);
        else {
          await gotoReady(page, s.url);
          await page.addStyleTag({ content: "[data-dev-tools]{display:none!important}" });
          await settle(page);
        }
        expect(await horizontalOverflow(page), `${s.name} @ ${width}`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `${OUT}/p4-${s.name}-${width}.png`, fullPage: true });
      }
      await context.close();
    }
  }
});
