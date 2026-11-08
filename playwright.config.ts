import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, APP_URL, MOCK_PORT, appEnv } from "./e2e/env";

/**
 * Tier 1 end-to-end suite: the real app (production build) against a fresh
 * Postgres database, with VideoSDK and Stripe replaced by e2e/mock-server.ts.
 *
 *   npm run test:e2e                 build, reset DB, run everything
 *   E2E_SKIP_BUILD=1 npm run test:e2e   reuse the last `next build`
 */
const skipBuild = Boolean(process.env.E2E_SKIP_BUILD);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Fake camera and microphone so the meeting lobby gets media without prompts.
    permissions: ["camera", "microphone"],
    launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/responsive.spec.ts", "**/isolated.spec.ts"],
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: "**/responsive.spec.ts" },
    // Tests that change shared mock state run alone, after everything else.
    {
      name: "isolated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/isolated.spec.ts",
      dependencies: ["desktop", "mobile"],
      fullyParallel: false,
      workers: 1,
    },
  ],
  webServer: [
    {
      command: "npx tsx e2e/mock-server.ts",
      url: `http://localhost:${MOCK_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
    },
    {
      command: [
        "npx tsx e2e/setup-db.ts",
        skipBuild ? null : "npx next build",
        `npx next start -p ${APP_PORT}`,
      ]
        .filter(Boolean)
        .join(" && "),
      url: `${APP_URL}/forgot-password`,
      env: appEnv,
      reuseExistingServer: false,
      timeout: 240_000,
      stdout: "pipe",
    },
  ],
});
