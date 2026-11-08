import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { db, stripeEvents } from "@/lib/db";
import { env } from "@/lib/env";
import { applySubscription, stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Skip events we've already handled (Stripe retries deliveries).
  const inserted = await db()
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (inserted.length === 0) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await applySubscription(await stripe().subscriptions.retrieve(subId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        // Re-fetch so out-of-order deliveries can't apply stale state.
        const sub = event.data.object;
        await applySubscription(await stripe().subscriptions.retrieve(sub.id));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] failed handling ${event.type}`, err);
    // Let Stripe retry this event later.
    await db().delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
