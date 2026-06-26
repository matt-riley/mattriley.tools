import { defineConfig, devices } from "@playwright/test";

// Mobile-only layout coverage. The vitest suite covers data/source contracts;
// this proves the rendered pages actually work on phone-width viewports
// (no horizontal scroll, titles visible and not clipped), which jsdom cannot.
// Run with: pnpm test:mobile (auto-builds + serves dist).

export default defineConfig({
  testDir: "./tests/mobile",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4321",
  },
  webServer: {
    // Reuse a stale-but-present dist if it exists (CI builds before test);
    // otherwise build fresh. Avoids a redundant second build in CI.
    command: "[ -d dist ] || pnpm exec astro build; pnpm exec astro preview --port 4321",
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
});
