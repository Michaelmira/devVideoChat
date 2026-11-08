import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findSession, serializeSession } from "@/lib/sessions";

/** Public: polled by the join page and the meeting timer. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[meetingId]/status">) {
  const { meetingId } = await ctx.params;
  const found = await findSession(meetingId);
  if (!found) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const user = await getCurrentUser();
  const s = serializeSession(found.session, found.creator);
  return NextResponse.json(
    {
      status: s.status,
      endsAt: s.endsAt,
      startedAt: s.startedAt,
      maxDurationMinutes: s.maxDurationMinutes,
      recordingStatus: s.recordingStatus,
      creatorName: found.creator.firstName,
      isHost: user?.id === found.session.creatorId,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
