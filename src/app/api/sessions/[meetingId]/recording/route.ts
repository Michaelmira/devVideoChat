import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isPremium } from "@/lib/auth";
import { db, videoSessions } from "@/lib/db";
import { findSession, isLive } from "@/lib/sessions";
import { startRecording, stopRecording } from "@/lib/videosdk";

type Ctx = RouteContext<"/api/sessions/[meetingId]/recording">;

async function authorize(ctx: Ctx) {
  const { meetingId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (!isPremium(user)) {
    return { error: NextResponse.json({ error: "Recording is a Premium feature" }, { status: 403 }) };
  }
  const found = await findSession(meetingId);
  if (!found || found.session.creatorId !== user.id) {
    return { error: NextResponse.json({ error: "Only the host can record" }, { status: 403 }) };
  }
  return { session: found.session };
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!isLive(session)) return NextResponse.json({ error: "Session is over" }, { status: 410 });
  if (session.recordingStatus === "starting" || session.recordingStatus === "active") {
    return NextResponse.json({ recordingStatus: session.recordingStatus });
  }
  try {
    await startRecording(session.meetingId);
  } catch (err) {
    console.error("[recording] start failed", err);
    return NextResponse.json({ error: "Couldn't start recording. Make sure the meeting has started." }, { status: 502 });
  }
  await db()
    .update(videoSessions)
    .set({ recordingStatus: "starting", recordingUrl: null, recordingId: null })
    .where(eq(videoSessions.id, session.id));
  return NextResponse.json({ recordingStatus: "starting" });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await authorize(ctx);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (session.recordingStatus !== "starting" && session.recordingStatus !== "active") {
    return NextResponse.json({ error: "No recording in progress" }, { status: 409 });
  }
  try {
    // Stops only the recording; the meeting keeps going.
    await stopRecording(session.meetingId);
  } catch (err) {
    console.error("[recording] stop failed", err);
    return NextResponse.json({ error: "Couldn't stop recording. Try again." }, { status: 502 });
  }
  await db().update(videoSessions).set({ recordingStatus: "processing" }).where(eq(videoSessions.id, session.id));
  return NextResponse.json({ recordingStatus: "processing" });
}
