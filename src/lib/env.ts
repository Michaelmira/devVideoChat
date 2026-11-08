import "server-only";
import { z } from "zod";

/**
 * Server env, validated on first use (not at import, so `next build`
 * works without secrets). Variable names match the Flask app's .env so the
 * same Railway variables keep working.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET_KEY: z.string().min(16, "JWT_SECRET_KEY must be at least 16 characters"),
  APP_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  GMAIL: z.string().optional(),
  GMAIL_PASSWORD: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  REACT_APP_STRIPE_PUBLIC_KEY: z.string().optional(),

  VIDEOSDK_API_KEY: z.string().min(1),
  VIDEOSDK_SECRET_KEY: z.string().min(1),
  VIDEOSDK_API_ENDPOINT: z.string().url().default("https://api.videosdk.live/v2"),
  VIDEOSDK_WEBHOOK_SECRET: z.string().optional(),

  VERIFICATION_BYPASS_CODE: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment variables:\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** Public base URL of this app, without a trailing slash. */
export function appUrl(): string {
  const e = env();
  const url = e.APP_URL ?? e.FRONTEND_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function stripePublishableKey(): string | undefined {
  const e = env();
  return e.STRIPE_PUBLISHABLE_KEY ?? e.REACT_APP_STRIPE_PUBLIC_KEY;
}

export const isProduction = () => env().NODE_ENV === "production";
