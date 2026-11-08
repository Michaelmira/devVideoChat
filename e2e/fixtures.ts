import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import postgres from "postgres";
import Stripe from "stripe";
import { APP_URL, JWT_SECRET, MOCK_URL, STRIPE_WEBHOOK_SECRET, TEST_DATABASE_URL } from "./env";

export type TestUser = {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  stripeCustomerId: string | null;
};

type UserOptions = {
  password?: string;
  verified?: boolean;
  premium?: boolean;
  firstName?: string;
  /** Store this exact hash (e.g. the old app's OAuth placeholder). */
  rawPasswordHash?: string;
  stripeCustomerId?: string;
};

type SessionOptions = {
  meetingId?: string;
  status?: "active" | "ended" | "expired";
  expiresInMinutes?: number;
  startedMinutesAgo?: number | null;
  maxDurationMinutes?: number;
  recordingStatus?: string;
  recordingUrl?: string | null;
};

/** Werkzeug-format hash with low iterations, so seeding users is fast. */
export function werkzeugHash(password: string, iterations = 1000): string {
  const salt = randomBytes(8).toString("hex");
  const digest = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:sha256:${iterations}$${salt}$${digest}`;
}

export const uniqueEmail = (tag = "user") => `${tag}.${Date.now()}.${randomBytes(3).toString("hex")}@example.test`;

export const uniqueRoom = () =>
  `${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex")}`;

const sql = postgres(TEST_DATABASE_URL, { max: 4, onnotice: () => {} });

export const db = {
  sql,
  async createUser(opts: UserOptions = {}): Promise<TestUser> {
    const password = opts.password ?? "Passw0rd!";
    const email = uniqueEmail();
    const firstName = opts.firstName ?? "Ada";
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO "user" (first_name, last_name, phone, email, password, is_active, is_verified,
                          subscription_status, stripe_customer_id, current_period_end, date_joined)
      VALUES (${firstName}, 'Tester', 'Not provided', ${email},
              ${opts.rawPasswordHash ?? werkzeugHash(password)}, true, ${opts.verified ?? true},
              ${opts.premium ? "premium" : "free"}, ${opts.stripeCustomerId ?? null},
              ${opts.premium ? new Date(Date.now() + 30 * 86400_000) : null}, now())
      RETURNING id`;
    return { id: row.id, email, password, firstName, lastName: "Tester", stripeCustomerId: opts.stripeCustomerId ?? null };
  },
  async user(id: number) {
    const [row] = await sql`SELECT * FROM "user" WHERE id = ${id}`;
    return row;
  },
  async userByEmail(email: string) {
    const [row] = await sql`SELECT * FROM "user" WHERE lower(email) = lower(${email})`;
    return row;
  },
  async createSession(creatorId: number, opts: SessionOptions = {}) {
    const meetingId = opts.meetingId ?? uniqueRoom();
    const started =
      opts.startedMinutesAgo === undefined || opts.startedMinutesAgo === null
        ? null
        : new Date(Date.now() - opts.startedMinutesAgo * 60_000);
    await sql`
      INSERT INTO video_session (creator_id, meeting_id, session_url, created_at, expires_at,
                                 max_duration_minutes, started_at, status, recording_status, recording_url)
      VALUES (${creatorId}, ${meetingId}, ${`${APP_URL}/join/${meetingId}`}, now(),
              ${new Date(Date.now() + (opts.expiresInMinutes ?? 360) * 60_000)},
              ${opts.maxDurationMinutes ?? 70}, ${started}, ${opts.status ?? "active"},
              ${opts.recordingStatus ?? "none"}, ${opts.recordingUrl ?? null})`;
    return meetingId;
  },
  async session(meetingId: string) {
    const [row] = await sql`SELECT * FROM video_session WHERE meeting_id = ${meetingId}`;
    return row;
  },
  async sessionsFor(creatorId: number) {
    return sql`SELECT * FROM video_session WHERE creator_id = ${creatorId} ORDER BY id`;
  },
};

export const mock = {
  async calls(service: "videosdk" | "stripe", contains?: string) {
    const q = new URLSearchParams({ service, ...(contains ? { contains } : {}) });
    const res = await fetch(`${MOCK_URL}/__mock/calls?${q}`);
    return (await res.json()) as { method: string; path: string; body: Record<string, unknown> }[];
  },
  async post<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${MOCK_URL}/__mock/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as T;
  },
  async rooms(): Promise<Record<string, { active: boolean; recording: boolean }>> {
    return (await fetch(`${MOCK_URL}/__mock/rooms`)).json();
  },
};

const stripeClient = new Stripe("sk_test_unused");

/** Sends a correctly signed (or deliberately badly signed) Stripe webhook to the app. */
export async function sendStripeWebhook(event: Record<string, unknown>, opts: { badSignature?: boolean } = {}) {
  const payload = JSON.stringify({ object: "event", api_version: "2025-01-01", created: Math.floor(Date.now() / 1000), ...event });
  const header = stripeClient.webhooks.generateTestHeaderString({
    payload,
    secret: opts.badSignature ? "whsec_wrong" : STRIPE_WEBHOOK_SECRET,
  });
  return fetch(`${APP_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": header },
    body: payload,
  });
}

/** Signs the user in by setting the session cookie directly (skips the login form). */
export async function signIn(context: BrowserContext, user: { id: number }) {
  const token = await new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(JWT_SECRET));
  await context.addCookies([{ name: "gm_session", value: token, url: APP_URL, httpOnly: true, sameSite: "Lax" }]);
}

/** The visible form-level error (skips Next's empty route announcer). */
export function formAlert(page: Page) {
  return page.locator("main [role=alert], form [role=alert]").filter({ hasText: /\S/ }).first();
}

/** Asserts a toast with this text is showing (several toasts can be stacked). */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

type Fixtures = {
  user: TestUser;
  premiumUser: TestUser;
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  user: async ({}, use) => use(await db.createUser()),
  premiumUser: async ({}, use) => {
    const customer = await mock.post<{ id: string }>("customers", { email: "premium@example.test" });
    const user = await db.createUser({ premium: true, stripeCustomerId: customer.id });
    const sub = await mock.post<{ id: string }>("subscriptions", { customer: customer.id });
    await sql`UPDATE "user" SET subscription_id = ${sub.id} WHERE id = ${user.id}`;
    await use(user);
  },
  authedPage: async ({ page, context, user }, use) => {
    await signIn(context, user);
    await use(page);
  },
});

export { expect };
