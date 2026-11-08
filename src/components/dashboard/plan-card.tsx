"use client";

import { Check, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
  startCheckoutAction,
  type BillingResult,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PublicUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

const perks = ["6-hour meetings (free: 70 minutes)", "Cloud recording", "Recordings library on your dashboard"];

export function PlanCard({ user, billingEnabled }: { user: PublicUser; billingEnabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const premium = user.subscriptionStatus === "premium";
  const periodEnd = user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString() : null;

  function run(fn: () => Promise<BillingResult>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else if (res.message) toast.success(res.message);
      router.refresh();
    });
  }

  if (premium) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="size-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold">Premium</h2>
        </div>
        <p className="text-sm text-muted">
          {user.cancelAtPeriodEnd
            ? `Cancelled. You keep Premium until ${periodEnd ?? "the end of this billing period"}.`
            : periodEnd
              ? `Renews on ${periodEnd} for $${PLANS.premium.priceUsd}.`
              : "Your subscription is active."}
        </p>
        <ul className="space-y-1.5 text-sm">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Check className="size-4 text-success" aria-hidden /> {p}
            </li>
          ))}
        </ul>
        {user.cancelAtPeriodEnd ? (
          <Button variant="secondary" loading={pending} onClick={() => run(resumeSubscriptionAction)}>
            Resume subscription
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="text-muted"
            loading={pending}
            onClick={() => {
              if (window.confirm("Cancel Premium? You keep it until the end of the current billing period.")) {
                run(cancelSubscriptionAction);
              }
            }}
          >
            Cancel subscription
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-4 border-accent/40">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Upgrade to Premium</h2>
        <p>
          <span className="text-2xl font-bold">${PLANS.premium.priceUsd}</span>
          <span className="text-sm text-muted">/month</span>
        </p>
      </div>
      <ul className="space-y-1.5 text-sm">
        {perks.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <Check className="size-4 text-accent" aria-hidden /> {p}
          </li>
        ))}
      </ul>
      <Button className="w-full" loading={pending} disabled={!billingEnabled} onClick={() => run(startCheckoutAction)}>
        Upgrade with Stripe
      </Button>
      <p className="text-center text-xs text-muted">
        {billingEnabled ? "Secure checkout by Stripe. Cancel anytime." : "Billing is not configured on this server."}
      </p>
    </Card>
  );
}
