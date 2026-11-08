import { Timer } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { JoinForm } from "@/components/meeting/join-form";
import { SessionUnavailable } from "@/components/meeting/session-unavailable";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { findSession, isLive, msUntilEnd } from "@/lib/sessions";

export const metadata: Metadata = { title: "Join meeting", robots: { index: false } };

export default async function JoinPage(props: PageProps<"/join/[meetingId]">) {
  const { meetingId } = await props.params;
  const found = await findSession(meetingId);
  if (!found) return <SessionUnavailable reason="not-found" />;
  if (!isLive(found.session)) return <SessionUnavailable reason={found.session.status === "ended" ? "ended" : "expired"} />;

  const user = await getCurrentUser();
  if (user?.id === found.session.creatorId) redirect(`/meeting/${meetingId}`);

  const minutesLeft = Math.max(0, Math.round(msUntilEnd(found.session) / 60_000));

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-md space-y-6">
        <Logo />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{found.creator.firstName} invited you to a meeting</h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Timer className="size-4" aria-hidden />
            {found.session.startedAt ? `In progress · ${minutesLeft} min left` : "Waiting to start"}
          </p>
        </div>
        <JoinForm meetingId={meetingId} defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : undefined} />
        <p className="text-center text-xs text-muted">No download needed. Works in Chrome, Edge, Firefox and Safari.</p>
      </Card>
    </div>
  );
}
