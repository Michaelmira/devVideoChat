"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { appUrl, env } from "@/lib/env";
import { applySubscription, billingConfigured, ensureCustomer, stripe } from "@/lib/stripe";

export type BillingResult = { ok: true; message?: string } | { ok: false; error: string };

/** Sends the user to Stripe Checkout. One payment creates the subscription. */
export async function startCheckoutAction(): Promise<BillingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  if (isPremium(user)) return { ok: false, error: "You're already on Premium." };
  if (!billingConfigured()) return { ok: false, error: "Billing isn't set up yet." };

  const customer = await ensureCustomer(user);
  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: String(user.id),
    line_items: [{ price: env().STRIPE_PRICE_ID!, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl()}/dashboard?checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/dashboard?checkout=cancelled`,
    subscription_data: { metadata: { user_id: String(user.id) } },
  });
  if (!checkout.url) return { ok: false, error: "Couldn't start checkout." };
  redirect(checkout.url);
}

async function setCancelAtPeriodEnd(cancel: boolean): Promise<BillingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  if (!user.subscriptionId) return { ok: false, error: "No active subscription." };
  try {
    const sub = await stripe().subscriptions.update(user.subscriptionId, { cancel_at_period_end: cancel });
    await applySubscription(sub);
  } catch (err) {
    console.error("[stripe] update failed", err);
    // Subscription no longer exists in Stripe: fall back to free.
    await db()
      .update(users)
      .set({ subscriptionStatus: "free", subscriptionId: null, currentPeriodEnd: null, cancelAtPeriodEnd: false })
      .where(eq(users.id, user.id));
    revalidatePath("/dashboard");
    return { ok: false, error: "We couldn't find that subscription in Stripe. Your plan was reset to Free." };
  }
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: cancel ? "Subscription cancelled. You keep Premium until the end of this billing period." : "Subscription resumed.",
  };
}

export async function cancelSubscriptionAction() {
  return setCancelAtPeriodEnd(true);
}

export async function resumeSubscriptionAction() {
  return setCancelAtPeriodEnd(false);
}
