/**
 * Settings for the tier 2 (live) suite. Real VideoSDK and Stripe test-mode keys
 * come from the environment (CI secrets) or, locally, from .env. Everything
 * else (database, URLs, OAuth, email) is overridden so tests never touch
 * production data.
 */
import { readFileSync } from "node:fs";

function readDotEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .filter((l) => /^[A-Z0-9_]+=/.test(l))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"(.*)"$/, "$1")];
        }),
    );
  } catch {
    return {};
  }
}

const dotenv = readDotEnv();
const pick = (name: string) => process.env[name] || dotenv[name] || "";

export const LIVE_APP_PORT = Number(process.env.E2E_LIVE_APP_PORT ?? 3200);
export const LIVE_APP_URL = `http://localhost:${LIVE_APP_PORT}`;

const baseDb = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/devvideochat_test";
export const LIVE_DATABASE_URL = (() => {
  // The config is loaded again inside each test worker, so don't add the suffix twice.
  const u = new URL(baseDb);
  const name = u.pathname.replace(/^\//, "");
  u.pathname = `/${name.endsWith("_live") ? name : `${name}_live`}`;
  return u.toString();
})();

export const liveKeys = {
  VIDEOSDK_API_KEY: pick("VIDEOSDK_API_KEY"),
  VIDEOSDK_SECRET_KEY: pick("VIDEOSDK_SECRET_KEY"),
  STRIPE_SECRET_KEY: pick("STRIPE_SECRET_KEY"),
  STRIPE_PRICE_ID: pick("STRIPE_PRICE_ID"),
};

export function missingLiveKeys(): string[] {
  const missing = Object.entries(liveKeys)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (liveKeys.STRIPE_SECRET_KEY && !liveKeys.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    missing.push("STRIPE_SECRET_KEY (must be a test-mode sk_test_ key)");
  }
  return missing;
}

/** Outbound proxy for sandboxes that require one (ignored when unset). */
export const OUTBOUND_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || "";

export const liveAppEnv: Record<string, string> = {
  NODE_ENV: "production",
  DATABASE_URL: LIVE_DATABASE_URL,
  TEST_DATABASE_URL: LIVE_DATABASE_URL,
  APP_URL: LIVE_APP_URL,
  FRONTEND_URL: LIVE_APP_URL,
  JWT_SECRET_KEY: "e2e-jwt-secret-that-is-long-enough",
  ...liveKeys,
  VIDEOSDK_API_ENDPOINT: "https://api.videosdk.live/v2",
  // Stripe can't reach localhost, so webhooks aren't used; the app syncs on return from Checkout.
  STRIPE_WEBHOOK_SECRET: "whsec_unused_in_live_tests",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  GMAIL: "",
  GMAIL_PASSWORD: "",
  VERIFICATION_BYPASS_CODE: "",
  NEXT_TELEMETRY_DISABLED: "1",
  // Lets Node's fetch and http use HTTPS_PROXY where the sandbox requires it.
  ...(OUTBOUND_PROXY ? { NODE_USE_ENV_PROXY: "1", NODE_OPTIONS: "--disable-warning=UNDICI-EHPA" } : {}),
};
