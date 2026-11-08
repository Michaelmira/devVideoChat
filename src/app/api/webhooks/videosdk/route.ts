import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, videoSessions } from "@/lib/db";
import { syncRecording } from "@/lib/sessions";

/**
 * VideoSDK recording events. The payload is only used to find the session;
 * file URLs are fetched from the VideoSDK API, so a forged request can't
 * inject a link.
 */
export async function POST(req: NextRequest) {
  let body: { webhookType?: string; event?: string; data?: { meetingId?: string; roomId?: string }; meetingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const type = body.webhookType ?? body.event ?? "";
  const meetingId = body.data?.meetingId ?? body.data?.roomId ?? body.meetingId;
  if (!meetingId) return NextResponse.json({ ok: true });

  const [session] = await db().select().from(videoSessions).where(eq(videoSessions.meetingId, meetingId)).limit(1);
  if (!session) return NextResponse.json({ ok: true });

  if (/recording[-.]started/.test(type)) {
    await db().update(videoSessions).set({ recordingStatus: "active" }).where(eq(videoSessions.id, session.id));
  } else if (/recording[-.]stopping/.test(type)) {
    await db().update(videoSessions).set({ recordingStatus: "processing" }).where(eq(videoSessions.id, session.id));
  } else if (/recording[-.]stopped/.test(type)) {
    const updated = await syncRecording({ ...session, recordingStatus: "processing" });
    if (updated.recordingStatus !== "completed") {
      await db().update(videoSessions).set({ recordingStatus: "processing" }).where(eq(videoSessions.id, session.id));
    }
  } else if (/recording[-.]failed/.test(type)) {
    await db().update(videoSessions).set({ recordingStatus: "failed" }).where(eq(videoSessions.id, session.id));
  }
  return NextResponse.json({ ok: true });
}
