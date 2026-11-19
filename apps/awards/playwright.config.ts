import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3201);

/** Runs against a production build (`pnpm build` first). The dev phase switcher and styleguide are enabled for the test server only. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", testIgnore: /(phases|auth|vote|admin|a11y)\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    // Creates real accounts (cleaned up afterwards) and reads codes from Mailpit.
    { name: "auth", testMatch: /auth\.spec\.ts/, fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
    // Votes on the sample edition with throwaway members (removed afterwards); runs before the phase tests.
    { name: "vote", testMatch: /vote\.spec\.ts/, dependencies: ["auth"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
    // axe accessibility pass (Gate 7); serial because it creates an account.
    { name: "a11y", testMatch: /a11y\.spec\.ts/, dependencies: ["admin"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
    // Admin CMS end to end on a throwaway 2099 edition (removed afterwards).
    { name: "admin", testMatch: /admin\.spec\.ts/, dependencies: ["vote"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
    // Switches the shared sample edition's phase, so it runs alone, after the rest (A-38).
    { name: "phases", testMatch: /phases\.spec\.ts/, dependencies: ["chromium", "auth", "vote", "admin", "a11y"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Never reuse: a leftover server would silently test an old build.
    reuseExistingServer: false,
    timeout: 60_000,
    // Turnstile is bypassed on the test server only (APP_ENV is never production here; A-11).
    env: { ENABLE_DEV_TOOLS: "1", ENABLE_STYLEGUIDE: "1", TURNSTILE_BYPASS: "1", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, BETTER_AUTH_URL: `http://localhost:${PORT}` },
  },
});
