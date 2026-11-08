import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MeetingClient } from "@/components/meeting/meeting-client";
import { SessionUnavailable } from "@/components/meeting/session-unavailable";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { endsAt, findSession, isLive, msUntilEnd } from "@/lib/sessions";
import { videoSdkToken } from "@/lib/videosdk";

export const metadata: Metadata = { title: "Meeting", robots: { index: false } };

export default async function MeetingPage(props: PageProps<"/meeting/[meetingId]">) {
  const { meetingId } = await props.params;
  const sp = await props.searchParams;

  const found = await findSession(meetingId);
  if (!found) return <SessionUnavailable reason="not-found" />;
  const { session, creator } = found;
  if (!isLive(session)) return <SessionUnavailable reason={session.status === "ended" ? "ended" : "expired"} />;

  const user = await getCurrentUser();
  const isHost = user?.id === session.creatorId;

  let name: string;
  if (isHost) {
    name = `${user.firstName} ${user.lastName}`.trim();
  } else {
    const raw = typeof sp.name === "string" ? sp.name.trim().slice(0, 40) : "";
    if (!raw) redirect(`/join/${meetingId}`);
    name = raw;
  }

  // Token is scoped to this room and expires when the meeting must end.
  const hoursLeft = Math.max(1, Math.ceil(msUntilEnd(session) / 3600_000));
  const token = await videoSdkToken({
    roomId: meetingId,
    permissions: isHost ? ["allow_join", "allow_mod"] : ["allow_join"],
    ttlHours: Math.min(hoursLeft, 7),
  });

  return (
    <MeetingClient
      meetingId={meetingId}
      token={token}
      name={name}
      isHost={isHost}
      canRecord={Boolean(isHost && user && isPremium(user))}
      endsAt={endsAt(session).toISOString()}
      hostName={creator.firstName}
    />
  );
}
