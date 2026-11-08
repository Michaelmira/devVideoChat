import { defineConfig, devices } from "@playwright/test";
import { LIVE_APP_PORT, LIVE_APP_URL, LIVE_DATABASE_URL, OUTBOUND_PROXY, liveAppEnv, missingLiveKeys } from "./e2e-live/live-env";

/**
 * Tier 2: live smoke tests against real VideoSDK and Stripe (test mode).
 *
 *   npm run test:e2e:live
 *
 * Needs VIDEOSDK_API_KEY, VIDEOSDK_SECRET_KEY, STRIPE_SECRET_KEY (sk_test_) and
 * STRIPE_PRICE_ID in the environment or .env. Uses its own database
 * (<TEST_DATABASE_URL>_live), never the one in .env.
 */
const missing = missingLiveKeys();
if (missing.length) {
  throw new Error(`Live tests need: ${missing.join(", ")}`);
}

// Shared e2e helpers (e2e/fixtures.ts) read these when test workers load them.
process.env.TEST_DATABASE_URL = LIVE_DATABASE_URL;
process.env.E2E_APP_PORT = String(LIVE_APP_PORT);
// Test workers call VideoSDK and Stripe directly too; let Node use the sandbox proxy if there is one.
if (OUTBOUND_PROXY) process.env.NODE_USE_ENV_PROXY = "1";

const skipBuild = Boolean(process.env.E2E_SKIP_BUILD);

export default defineConfig({
  testDir: "./e2e-live",
  testMatch: "**/*.live.spec.ts",
  // Real meetings and payments: run one at a time, keep failures easy to read.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "playwright-report-live" }]] : [["list"]],
  outputDir: "test-results-live",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: LIVE_APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    permissions: ["camera", "microphone", "clipboard-read", "clipboard-write"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        // Screen sharing picks the current tab without a picker.
        "--auto-accept-this-tab-capture",
        "--auto-select-desktop-capture-source=Entire screen",
      ],
      ...(OUTBOUND_PROXY ? { proxy: { server: OUTBOUND_PROXY, bypass: "localhost,127.0.0.1" } } : {}),
    },
  },
  webServer: {
    command: [
      "npx tsx e2e/setup-db.ts",
      skipBuild ? null : "npx next build",
      `npx next start -p ${LIVE_APP_PORT}`,
    ]
      .filter(Boolean)
      .join(" && "),
    url: `${LIVE_APP_URL}/forgot-password`,
    env: liveAppEnv,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "pipe",
  },
});
