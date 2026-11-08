import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, users, type User } from "@/lib/db";
import { env } from "@/lib/env";

let client: Stripe | undefined;

export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) {
    // STRIPE_API_BASE points the SDK at a mock server in end-to-end tests.
    const base = env().STRIPE_API_BASE ? new URL(env().STRIPE_API_BASE!) : null;
    client = new Stripe(
      key,
      base
        ? {
            host: base.hostname,
            port: base.port || (base.protocol === "https:" ? 443 : 80),
            protocol: base.protocol === "https:" ? "https" : "http",
            telemetry: false,
            maxNetworkRetries: 0,
          }
        : {},
    );
  }
  return client;
}

export function billingConfigured(): boolean {
  const e = env();
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_PRICE_ID);
}

/** Statuses where the customer keeps premium access. */
const PREMIUM_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

/**
 * In current Stripe API versions the billing period lives on subscription
 * items; older versions had it on the subscription itself.
 */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const ts = fromItem ?? legacy;
  return ts ? new Date(ts * 1000) : null;
}

/** Writes a Stripe subscription's state onto the matching user. */
export async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const premium = PREMIUM_STATUSES.includes(sub.status);
  await db()
    .update(users)
    .set(
      premium
        ? {
            subscriptionStatus: "premium",
            subscriptionId: sub.id,
            currentPeriodEnd: periodEnd(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          }
        : {
            subscriptionStatus: "free",
            subscriptionId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
    )
    .where(eq(users.stripeCustomerId, customerId));
}

/** Returns the user's Stripe customer id, creating the customer if needed. */
export async function ensureCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe().customers.retrieve(user.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) return user.stripeCustomerId;
    } catch (err) {
      if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) throw err;
    }
  }
  const customer = await stripe().customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    metadata: { user_id: String(user.id) },
  });
  await db().update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
  return customer.id;
}

/**
 * Called when Stripe sends the user back. Applies the subscription right away
 * instead of waiting for the webhook.
 */
export async function syncCheckout(checkoutSessionId: string, userId: number): Promise<boolean> {
  if (!billingConfigured()) return false;
  try {
    const session = await stripe().checkout.sessions.retrieve(checkoutSessionId, { expand: ["subscription"] });
    if (session.client_reference_id !== String(userId) || !session.subscription) return false;
    const sub = typeof session.subscription === "string"
      ? await stripe().subscriptions.retrieve(session.subscription)
      : session.subscription;
    await applySubscription(sub);
    return true;
  } catch (err) {
    console.error("[stripe] checkout sync failed", err);
    return false;
  }
}
