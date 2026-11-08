import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findSession, isLive, markStarted } from "@/lib/sessions";

/** Host joined: start the plan clock (first time only). */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sessions/[meetingId]/start">) {
  const { meetingId } = await ctx.params;
  const user = await getCurrentUser();
  const found = await findSession(meetingId);
  if (!user || !found || found.session.creatorId !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!isLive(found.session)) return NextResponse.json({ error: "Session is over" }, { status: 410 });
  if (!found.session.startedAt) await markStarted(found.session.id);
  return NextResponse.json({ ok: true });
}
