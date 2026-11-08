import { STRIPE_PRICE_ID } from "./env";
import { db, expect, mock, sendStripeWebhook, signIn, test, expectToast } from "./fixtures";

test.describe("upgrade with Stripe Checkout", () => {
  test("pay once, come back as Premium, one subscription created", async ({ authedPage: page, user }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Upgrade with Stripe" }).click();

    await expect(page.getByRole("heading", { name: "Mock Stripe Checkout" })).toBeVisible();
    await expect(page.getByText(`Price: ${STRIPE_PRICE_ID}`)).toBeVisible();
    const row = await db.user(user.id);
    expect(row.stripe_customer_id).toMatch(/^cus_/);

    await page.getByRole("link", { name: "Pay $3.00" }).click();
    await expect(page).toHaveURL(/\/dashboard\?upgraded=1$/);
    await expect(page.getByText("You're on Premium now")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Premium", exact: true })).toBeVisible();

    const after = await db.user(user.id);
    expect(after.subscription_status).toBe("premium");
    expect(after.subscription_id).toMatch(/^sub_/);
    expect(new Date(after.current_period_end).getTime()).toBeGreaterThan(Date.now() + 29 * 86400_000);

    // The old app also created a separate $3 PaymentIntent. Make sure nothing like that happens.
    const stripeCalls = await mock.calls("stripe", row.stripe_customer_id);
    expect(stripeCalls.some((c) => c.path.includes("payment_intents"))).toBe(false);
    const sessions = stripeCalls.filter((c) => c.method === "POST" && c.path === "/v1/checkout/sessions");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].body).toMatchObject({ mode: "subscription", client_reference_id: String(user.id) });
  });

  test("backing out of checkout changes nothing", async ({ authedPage: page, user }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Upgrade with Stripe" }).click();
    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL(/checkout=cancelled/);
    await expect(page.getByText("Checkout cancelled. You haven't been charged.")).toBeVisible();
    expect((await db.user(user.id)).subscription_status).toBe("free");
  });

  test("someone else's checkout session can't upgrade you", async ({ page, context, user }) => {
    // Another user starts and pays a checkout.
    const other = await db.createUser();
    await signIn(context, other);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Upgrade with Stripe" }).click();
    await page.waitForURL(/\/checkout\/cs_test_/);
    const checkoutId = new URL(page.url()).pathname.split("/").pop()!;

    await context.clearCookies();
    await signIn(context, user);
    await page.goto(`/dashboard?checkout_session_id=${checkoutId}`);
    await expect(page).toHaveURL(/\/dashboard$/);
    expect((await db.user(user.id)).subscription_status).toBe("free");
  });

  test("reuses an existing Stripe customer", async ({ page, context }) => {
    const customer = await mock.post<{ id: string }>("customers", { email: "existing@example.test" });
    const user = await db.createUser({ stripeCustomerId: customer.id });
    await signIn(context, user);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Upgrade with Stripe" }).click();
    await expect(page.getByRole("heading", { name: "Mock Stripe Checkout" })).toBeVisible();
    expect((await db.user(user.id)).stripe_customer_id).toBe(customer.id);
  });

  test("a deleted Stripe customer is replaced", async ({ page, context }) => {
    const user = await db.createUser({ stripeCustomerId: "cus_deleted_long_ago" });
    await signIn(context, user);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Upgrade with Stripe" }).click();
    await expect(page.getByRole("heading", { name: "Mock Stripe Checkout" })).toBeVisible();
    expect((await db.user(user.id)).stripe_customer_id).not.toBe("cus_deleted_long_ago");
  });
});

test.describe("cancel and resume", () => {
  test("cancel keeps Premium until the period ends, resume undoes it", async ({ page, context, premiumUser }) => {
    await signIn(context, premiumUser);
    await page.goto("/dashboard");

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel subscription" }).click();
    await expectToast(page, "You keep Premium until the end of this billing period");
    await expect(page.getByText(/Cancelled\. You keep Premium until/)).toBeVisible();
    let row = await db.user(premiumUser.id);
    expect(row.subscription_status).toBe("premium");
    expect(row.cancel_at_period_end).toBe(true);

    await page.getByRole("button", { name: "Resume subscription" }).click();
    await expectToast(page, "Subscription resumed.");
    await expect(page.getByText(/Renews on/)).toBeVisible();
    row = await db.user(premiumUser.id);
    expect(row.cancel_at_period_end).toBe(false);
  });

  test("a subscription missing in Stripe falls back to Free", async ({ page, context }) => {
    const user = await db.createUser({ premium: true });
    await db.sql`UPDATE "user" SET subscription_id = 'sub_does_not_exist' WHERE id = ${user.id}`;
    await signIn(context, user);
    await page.goto("/dashboard");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel subscription" }).click();
    await expectToast(page, "Your plan was reset to Free");
    await expect(page.getByRole("heading", { name: "Upgrade to Premium" })).toBeVisible();
  });
});

test.describe("Stripe webhook", () => {
  async function customerWithUser() {
    const customer = await mock.post<{ id: string }>("customers", { email: "hook@example.test" });
    const user = await db.createUser({ stripeCustomerId: customer.id });
    return { customer: customer.id, user };
  }

  test("rejects bad and missing signatures", async ({ request }) => {
    const bad = await sendStripeWebhook({ id: "evt_bad", type: "ping", data: { object: {} } }, { badSignature: true });
    expect(bad.status).toBe(400);
    const missing = await request.post("/api/webhooks/stripe", { data: "{}" });
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toEqual({ error: "Missing Stripe-Signature header" });
  });

  test("subscription.created upgrades the matching user", async () => {
    const { customer, user } = await customerWithUser();
    const sub = await mock.post<{ id: string }>("subscriptions", { customer });
    const res = await sendStripeWebhook({
      id: `evt_${Date.now()}_created`,
      type: "customer.subscription.created",
      data: { object: { id: sub.id, object: "subscription", customer } },
    });
    expect(res.status).toBe(200);
    const row = await db.user(user.id);
    expect(row.subscription_status).toBe("premium");
    expect(row.subscription_id).toBe(sub.id);
  });

  test("uses Stripe's current state, not the event payload", async () => {
    const { customer, user } = await customerWithUser();
    const sub = await mock.post<{ id: string }>("subscriptions", { customer, overrides: { status: "canceled" } });
    // The payload claims "active", but Stripe says canceled: the user must stay free.
    await sendStripeWebhook({
      id: `evt_${Date.now()}_stale`,
      type: "customer.subscription.updated",
      data: { object: { id: sub.id, object: "subscription", customer, status: "active" } },
    });
    expect((await db.user(user.id)).subscription_status).toBe("free");
  });

  test("past_due keeps Premium; canceled and unpaid drop to Free", async () => {
    const { customer, user } = await customerWithUser();
    const sub = await mock.post<{ id: string }>("subscriptions", { customer });
    const deliver = (status: string, n: number) =>
      mock.post(`subscriptions/${sub.id}`, { status }).then(() =>
        sendStripeWebhook({
          id: `evt_${Date.now()}_${n}`,
          type: "customer.subscription.updated",
          data: { object: { id: sub.id, object: "subscription", customer } },
        }),
      );
    await deliver("past_due", 1);
    expect((await db.user(user.id)).subscription_status).toBe("premium");
    await deliver("unpaid", 2);
    expect((await db.user(user.id)).subscription_status).toBe("free");
    await deliver("active", 3);
    expect((await db.user(user.id)).subscription_status).toBe("premium");
    await deliver("canceled", 4);
    const row = await db.user(user.id);
    expect(row.subscription_status).toBe("free");
    expect(row.subscription_id).toBeNull();
    expect(row.current_period_end).toBeNull();
  });

  test("duplicate deliveries are processed once", async () => {
    const { customer, user } = await customerWithUser();
    const sub = await mock.post<{ id: string }>("subscriptions", { customer });
    const event = {
      id: `evt_${Date.now()}_dup`,
      type: "customer.subscription.created",
      data: { object: { id: sub.id, object: "subscription", customer } },
    };
    await sendStripeWebhook(event);
    await db.sql`UPDATE "user" SET subscription_status = 'free' WHERE id = ${user.id}`;
    const second = await sendStripeWebhook(event);
    expect(await second.json()).toMatchObject({ duplicate: true });
    expect((await db.user(user.id)).subscription_status).toBe("free");
  });

  test("checkout.session.completed upgrades via the session's subscription", async () => {
    const { customer, user } = await customerWithUser();
    const sub = await mock.post<{ id: string }>("subscriptions", { customer });
    await sendStripeWebhook({
      id: `evt_${Date.now()}_checkout`,
      type: "checkout.session.completed",
      data: { object: { id: "cs_x", object: "checkout.session", mode: "subscription", subscription: sub.id, customer } },
    });
    expect((await db.user(user.id)).subscription_status).toBe("premium");
  });

  test("unrelated events are accepted and ignored", async () => {
    const res = await sendStripeWebhook({ id: `evt_${Date.now()}_other`, type: "invoice.created", data: { object: {} } });
    expect(res.status).toBe(200);
  });
});
