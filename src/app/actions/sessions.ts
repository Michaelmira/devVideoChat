"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { SessionError, createVideoSession, endVideoSession, serializeSession, type SessionDTO } from "@/lib/sessions";

export type SessionActionResult = { ok: true; session?: SessionDTO } | { ok: false; error: string };

export async function createSessionAction(): Promise<SessionActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    const session = await createVideoSession(user);
    revalidatePath("/dashboard");
    return { ok: true, session: serializeSession(session) };
  } catch (err) {
    if (err instanceof SessionError) return { ok: false, error: err.message };
    console.error("[sessions] create failed", err);
    return { ok: false, error: "Couldn't create the meeting. Try again in a moment." };
  }
}

export async function endSessionAction(meetingId: string): Promise<SessionActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    await endVideoSession(user, meetingId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof SessionError) return { ok: false, error: err.message };
    console.error("[sessions] end failed", err);
    return { ok: false, error: "Couldn't end the session." };
  }
}
