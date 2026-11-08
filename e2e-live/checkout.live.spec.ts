import { db, expect, signIn, test } from "../e2e/fixtures";
import type { Locator } from "@playwright/test";
import { stripe } from "./helpers";

/** True if the element is on the page and visible right now (doesn't wait). */
async function present(locator: Locator) {
  return (await locator.count()) > 0 && (await locator.first().isVisible());
}

test("upgrade through the real Stripe Checkout page with a test card, then cancel", async ({ page, context, user }) => {
  await signIn(context, user);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Upgrade with Stripe" }).click();

  // Stripe-hosted page (test mode).
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  await expect(page.getByText("$3.00").first()).toBeVisible({ timeout: 30_000 });

  const email = page.locator("#email");
  if ((await present(email)) && (await email.isEditable())) await email.fill(user.email);
  // When several payment methods are enabled, Checkout shows an accordion: open Card.
  // The row is covered by a transparent button, so click through to it.
  const cardRow = page.locator("#payment-method-label-card");
  const cardNumber = page.locator("#cardNumber");
  await cardRow.or(cardNumber).first().waitFor();
  if (!(await cardNumber.isVisible())) await cardRow.click({ force: true });
  await cardNumber.waitFor();

  await cardNumber.fill("4242 4242 4242 4242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Ada Tester");
  const country = page.locator("#billingCountry");
  if (await present(country)) await country.selectOption("US");
  const zip = page.locator("#billingPostalCode");
  if (await present(zip)) await zip.fill("10001");
  // Don't opt into Stripe Link (it would ask for a phone number).
  const link = page.locator("#enableStripePass");
  if ((await present(link)) && (await link.isChecked())) await link.uncheck();

  await page.locator("button[type=submit]").click();

  // Back on our dashboard, upgraded straight away (no webhook needed).
  await page.waitForURL(/\/dashboard\?upgraded=1$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Premium", exact: true })).toBeVisible();

  const row = await db.user(user.id);
  expect(row.subscription_status).toBe("premium");
  const sub = await stripe.subscriptions.retrieve(row.subscription_id);
  expect(sub.status).toBe("active");
  expect(sub.customer).toBe(row.stripe_customer_id);

  // Exactly one $3 charge for the first month (the old app charged twice).
  const invoices = await stripe.invoices.list({ customer: row.stripe_customer_id, limit: 10 });
  expect(invoices.data).toHaveLength(1);
  expect(invoices.data[0].amount_paid).toBe(300);
  const intents = await stripe.paymentIntents.list({ customer: row.stripe_customer_id, limit: 10 });
  expect(intents.data.filter((pi) => pi.status === "succeeded")).toHaveLength(1);

  try {
    // Cancel from the dashboard: stays Premium until the period ends.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel subscription" }).click();
    await expect(page.getByText(/Cancelled\. You keep Premium until/)).toBeVisible();
    const cancelled = await stripe.subscriptions.retrieve(row.subscription_id);
    expect(cancelled.cancel_at_period_end).toBe(true);
    expect(cancelled.status).toBe("active");
  } finally {
    // Don't leave test subscriptions running in the Stripe test account.
    await stripe.subscriptions.cancel(row.subscription_id).catch(() => {});
  }
});
