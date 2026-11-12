import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * Runs against a production build (`pnpm build` first). The styleguide is
 * only rendered in builds made with ENABLE_STYLEGUIDE=1.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  expect: { timeout: 10_000 },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // Read-only checks (public pages, screenshots, auth) run in parallel first…
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /admin-content\.spec\.ts|sample-removal\.spec\.ts/ },
    // …then tests that create/delete content, so they never race the screenshots.
    { name: "content", use: { ...devices["Desktop Chrome"] }, testMatch: /admin-content\.spec\.ts|sample-removal\.spec\.ts/, dependencies: ["chromium"] },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Never reuse: a leftover server would silently test an old build.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
