import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3201);

/** Runs against a production build (`pnpm build` first). The styleguide is enabled for the test server only. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    // Throwaway public content (edition 2097, e2e-* artists): the seed creates none (A-81).
    { name: "fixture", testMatch: /fixture\.setup\.ts/, teardown: "fixture-teardown" },
    { name: "fixture-teardown", testMatch: /fixture\.teardown\.ts/ },
    { name: "chromium", testIgnore: /(auth|admin|a11y)\.spec\.ts/, dependencies: ["fixture"], use: { ...devices["Desktop Chrome"] } },
    // Throwaway staff accounts (removed afterwards); reads password-reset codes from Mailpit.
    { name: "auth", testMatch: /auth\.spec\.ts/, dependencies: ["fixture"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
    // Admin CMS end to end on a throwaway 2099 edition (removed afterwards).
    { name: "admin", testMatch: /admin\.spec\.ts/, dependencies: ["auth"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
    // axe accessibility pass; serial because it creates a staff account.
    { name: "a11y", testMatch: /a11y\.spec\.ts/, dependencies: ["admin"], fullyParallel: false, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    // Health, not "/": loading the home page here would cache it before the e2e fixture exists.
    url: `http://localhost:${PORT}/api/health`,
    // Never reuse: a leftover server would silently test an old build.
    reuseExistingServer: false,
    timeout: 60_000,
    env: { ENABLE_STYLEGUIDE: "1", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, BETTER_AUTH_URL: `http://localhost:${PORT}` },
  },
});
