import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SessionError, endVideoSession } from "@/lib/sessions";

/**
 * Host ends the meeting from inside the call. A route handler (not a server
 * action) so the meeting page isn't re-rendered mid-call.
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/sessions/[meetingId]">) {
  const { meetingId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    await endVideoSession(user, meetingId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
