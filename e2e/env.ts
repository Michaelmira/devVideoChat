/** Settings shared by the Playwright config, the mock server and the tests. */
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
export const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 3199);
export const APP_URL = `http://localhost:${APP_PORT}`;
export const MOCK_URL = `http://localhost:${MOCK_PORT}`;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/devvideochat_test";

export const JWT_SECRET = "e2e-jwt-secret-that-is-long-enough";
export const STRIPE_WEBHOOK_SECRET = "whsec_e2e_test_secret";
export const STRIPE_PRICE_ID = "price_e2e_premium";

/**
 * Env for the app under test. Every external service points at the mock
 * server, and every secret is a dummy, so a local .env can't leak into tests.
 */
export const appEnv: Record<string, string> = {
  NODE_ENV: "production",
  DATABASE_URL: TEST_DATABASE_URL,
  APP_URL,
  FRONTEND_URL: APP_URL,
  JWT_SECRET_KEY: JWT_SECRET,
  VIDEOSDK_API_KEY: "e2e-videosdk-key",
  VIDEOSDK_SECRET_KEY: "e2e-videosdk-secret",
  VIDEOSDK_API_ENDPOINT: `${MOCK_URL}/videosdk/v2`,
  STRIPE_SECRET_KEY: "sk_test_e2e",
  STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_API_BASE: MOCK_URL,
  GOOGLE_CLIENT_ID: "e2e-google-client",
  GOOGLE_CLIENT_SECRET: "e2e-google-secret",
  GITHUB_CLIENT_ID: "e2e-github-client",
  GITHUB_CLIENT_SECRET: "e2e-github-secret",
  GMAIL: "",
  GMAIL_PASSWORD: "",
  VERIFICATION_BYPASS_CODE: "999000",
  NEXT_TELEMETRY_DISABLED: "1",
};
