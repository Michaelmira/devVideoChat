import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/dashboard/account-settings";
import { PlanCard } from "@/components/dashboard/plan-card";
import { RecordingsList } from "@/components/dashboard/recordings-list";
import { SessionsPanel } from "@/components/dashboard/sessions-panel";
import { Alert } from "@/components/ui/card";
import { isPremium, publicUser, requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { activeSessionsFor, recordingsFor, serializeSession } from "@/lib/sessions";
import { billingConfigured, syncCheckout } from "@/lib/stripe";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const user = await requireUser();

  // Returning from Stripe Checkout: apply the subscription now, then drop the query string.
  const checkoutId = typeof sp.checkout_session_id === "string" ? sp.checkout_session_id : undefined;
  if (checkoutId) {
    const ok = await syncCheckout(checkoutId, user.id);
    redirect(ok ? "/dashboard?upgraded=1" : "/dashboard");
  }

  const premium = isPremium(user);
  const [sessions, recordings] = await Promise.all([
    activeSessionsFor(user.id),
    premium ? recordingsFor(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hi, {user.firstName}</h1>
        <p className="text-sm text-muted">Start a meeting and share the link with anyone.</p>
      </div>

      {sp.welcome && <Alert tone="success">Your email is verified. Welcome to GuildMeet!</Alert>}
      {sp.upgraded && <Alert tone="success">You&apos;re on Premium now. Enjoy 6-hour meetings and recording.</Alert>}
      {sp.checkout === "cancelled" && <Alert>Checkout cancelled. You haven&apos;t been charged.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <SessionsPanel
            sessions={sessions.map((s) => serializeSession(s))}
            planMinutes={premium ? PLANS.premium.sessionMinutes : PLANS.free.sessionMinutes}
          />
          <RecordingsList
            enabled={premium}
            recordings={recordings.map((r) => ({
              meetingId: r.meetingId,
              createdAt: r.createdAt?.toISOString() ?? null,
              status: r.recordingUrl ? "completed" : (r.recordingStatus ?? "none"),
              url: r.recordingUrl,
            }))}
          />
        </div>
        <div className="space-y-6">
          <PlanCard user={publicUser(user)} billingEnabled={billingConfigured()} />
          <AccountSettings user={publicUser(user)} />
        </div>
      </div>
    </div>
  );
}
