import { defineConfig, devices } from "@playwright/test"
import { playwrightBaseConfig } from "@jsr/spy4x__preact-system/playwright"

/**
 * Playwright configuration for the storefront on the sample shop (`e2e/shop/run.sh` starts it and
 * sets `SHOP_BASE_URL`). Apart from `e2e/mpa`, whose stack has a database and an empty catalog.
 */
export default defineConfig({
  ...playwrightBaseConfig({
    baseURL: Deno.env.get("SHOP_BASE_URL") ?? "http://127.0.0.1:48420",
    ci: !!Deno.env.get("CI"),
    chromium: devices["Desktop Chrome"],
  }),
  // A test that fails once must fail the run (#394).
  retries: 0,
  testDir: ".",
  testMatch: /.*\.shop\.ts/,
  outputDir: "../results/shop",
  reporter: [["list"]],
})
