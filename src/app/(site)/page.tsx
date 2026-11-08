import { CalendarClock, Link2, ShieldCheck, Video, Clapperboard, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUser } from "@/lib/auth";
import { providerConfigured } from "@/lib/oauth";
import { PLANS } from "@/lib/plans";

const AUTH_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  invalid_state: "That sign-in link expired. Please try again.",
  provider_error: "We couldn't reach the sign-in provider. Please try again.",
  provider_unavailable: "That sign-in option isn't available.",
  email_not_verified: "Your account email isn't verified with that provider.",
  account_disabled: "This account is disabled.",
};

export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const next = one("next");
  if (await getCurrentUser()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");

  const authError = one("auth_error");
  const notice = authError
    ? { tone: "error" as const, text: AUTH_ERRORS[authError] ?? "Sign-in failed. Please try again." }
    : one("reset")
      ? { tone: "success" as const, text: "Password updated. Sign in with your new password." }
      : one("verified")
        ? { tone: "success" as const, text: "Email verified. You can sign in now." }
        : undefined;

  const features = [
    { icon: Link2, title: "One link, no installs", text: "Create a meeting and share the link. Guests join from their browser." },
    { icon: Users, title: "Screen sharing", text: "Present your screen with zoom and pan so everyone can follow along." },
    { icon: CalendarClock, title: `${PLANS.free.sessionMinutes} free minutes`, text: "Every free meeting runs up to 70 minutes. Premium meetings run up to 6 hours." },
    { icon: Clapperboard, title: "Cloud recording", text: "Premium hosts can record meetings and watch them later from the dashboard." },
    { icon: ShieldCheck, title: "Private by default", text: "Links expire after 6 hours, and only the host can record or end the meeting." },
    { icon: Video, title: "HD video", text: "Grid and speaker layouts that adapt to desktop and mobile." },
  ];

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            Start with {PLANS.free.sessionMinutes} free minutes per meeting
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Video meetings in one click.
            <span className="block text-accent">Share a link. Start talking.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted">
            GuildMeet gives you a private meeting room in seconds. No downloads for you or your guests. Upgrade to
            Premium for ${PLANS.premium.priceUsd}/month to get 6-hour meetings and cloud recording.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <AuthCard
            initialMode={one("signin") || authError || notice ? "signin" : "signup"}
            providers={{ google: providerConfigured("google"), github: providerConfigured("github") }}
            notice={notice}
            next={next}
          />
        </div>
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="space-y-2">
              <f.icon className="size-5 text-accent" aria-hidden />
              <h2 className="font-semibold">{f.title}</h2>
              <p className="text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
