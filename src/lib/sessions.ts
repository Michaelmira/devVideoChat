import "server-only";
import { and, desc, eq, gt, isNotNull, ne, or } from "drizzle-orm";
import { isPremium } from "@/lib/auth";
import { db, users, videoSessions, type User, type VideoSession } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { LINK_LIFETIME_HOURS, PLANS } from "@/lib/plans";
import { createRoom, deactivateRoom, listRecordings } from "@/lib/videosdk";

export class SessionError extends Error {}

/** When a meeting must end: link expiry, or start + plan length, whichever is first. */
export function endsAt(s: Pick<VideoSession, "expiresAt" | "startedAt" | "maxDurationMinutes">): Date {
  const limit = s.startedAt
    ? new Date(s.startedAt.getTime() + (s.maxDurationMinutes ?? PLANS.free.sessionMinutes) * 60_000)
    : s.expiresAt;
  return limit < s.expiresAt ? limit : s.expiresAt;
}

/** Milliseconds until the meeting must end (negative once over). */
export function msUntilEnd(s: Pick<VideoSession, "expiresAt" | "startedAt" | "maxDurationMinutes">): number {
  return endsAt(s).getTime() - Date.now();
}

export function isLive(s: VideoSession, now = new Date()): boolean {
  return s.status === "active" && endsAt(s) > now;
}

export function serializeSession(s: VideoSession, creator?: Pick<User, "firstName" | "lastName">) {
  return {
    id: s.id,
    meetingId: s.meetingId,
    joinUrl: `${appUrl()}/join/${s.meetingId}`,
    createdAt: s.createdAt?.toISOString() ?? null,
    expiresAt: s.expiresAt.toISOString(),
    startedAt: s.startedAt?.toISOString() ?? null,
    endsAt: endsAt(s).toISOString(),
    maxDurationMinutes: s.maxDurationMinutes ?? PLANS.free.sessionMinutes,
    status: isLive(s) ? "active" : s.status === "ended" ? "ended" : "expired",
    recordingStatus: s.recordingStatus ?? "none",
    hasRecording: Boolean(s.recordingUrl),
    creatorName: creator ? `${creator.firstName} ${creator.lastName}`.trim() : undefined,
  };
}

export type SessionDTO = ReturnType<typeof serializeSession>;

/** Marks this user's sessions that have run out as expired. */
async function expireStale(userId: number) {
  const mine = await db()
    .select()
    .from(videoSessions)
    .where(and(eq(videoSessions.creatorId, userId), eq(videoSessions.status, "active")));
  const now = new Date();
  const stale = mine.filter((s) => endsAt(s) <= now);
  for (const s of stale) {
    await db().update(videoSessions).set({ status: "expired" }).where(eq(videoSessions.id, s.id));
  }
}

export async function activeSessionsFor(userId: number): Promise<VideoSession[]> {
  await expireStale(userId);
  return db()
    .select()
    .from(videoSessions)
    .where(
      and(eq(videoSessions.creatorId, userId), eq(videoSessions.status, "active"), gt(videoSessions.expiresAt, new Date())),
    )
    .orderBy(desc(videoSessions.createdAt));
}

export async function createVideoSession(user: User): Promise<VideoSession> {
  const plan = isPremium(user) ? PLANS.premium : PLANS.free;
  const active = await activeSessionsFor(user.id);
  if (active.length >= plan.maxActiveSessions) {
    throw new SessionError("You already have an active session. End it before starting a new one.");
  }
  const { roomId } = await createRoom({ maxMinutes: plan.sessionMinutes });
  const [created] = await db()
    .insert(videoSessions)
    .values({
      creatorId: user.id,
      meetingId: roomId,
      sessionUrl: `${appUrl()}/join/${roomId}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + LINK_LIFETIME_HOURS * 3600_000),
      maxDurationMinutes: plan.sessionMinutes,
      status: "active",
      recordingStatus: "none",
    })
    .returning();
  return created;
}

export async function findSession(meetingId: string) {
  const [row] = await db()
    .select({ session: videoSessions, creator: { id: users.id, firstName: users.firstName, lastName: users.lastName } })
    .from(videoSessions)
    .innerJoin(users, eq(users.id, videoSessions.creatorId))
    .where(eq(videoSessions.meetingId, meetingId))
    .limit(1);
  if (!row) return null;
  if (row.session.status === "active" && !isLive(row.session)) {
    await db().update(videoSessions).set({ status: "expired" }).where(eq(videoSessions.id, row.session.id));
    row.session.status = "expired";
  }
  return row;
}

export async function endVideoSession(user: User, meetingId: string): Promise<void> {
  const found = await findSession(meetingId);
  if (!found || found.session.creatorId !== user.id) throw new SessionError("Session not found.");
  await db().update(videoSessions).set({ status: "ended" }).where(eq(videoSessions.id, found.session.id));
  try {
    await deactivateRoom(meetingId);
  } catch (err) {
    console.warn("[videosdk] deactivate failed", err);
  }
}

/** Starts the plan clock the first time the host joins. */
export async function markStarted(sessionId: number): Promise<void> {
  await db()
    .update(videoSessions)
    .set({ startedAt: new Date() })
    .where(and(eq(videoSessions.id, sessionId), eq(videoSessions.status, "active")));
}

/**
 * Pulls finished recording files from VideoSDK for sessions still waiting on
 * one. Used by the webhook and as a fallback when the dashboard loads.
 */
export async function syncRecording(session: VideoSession): Promise<VideoSession> {
  if (!["starting", "active", "stopping", "processing"].includes(session.recordingStatus ?? "")) return session;
  try {
    const files = await listRecordings(session.meetingId);
    if (files.length === 0) return session;
    const [latest] = files;
    const [updated] = await db()
      .update(videoSessions)
      .set({ recordingUrl: latest.fileUrl, recordingId: latest.id, recordingStatus: "completed" })
      .where(eq(videoSessions.id, session.id))
      .returning();
    return updated;
  } catch (err) {
    console.warn("[videosdk] recording sync failed", err);
    return session;
  }
}

export async function recordingsFor(userId: number): Promise<VideoSession[]> {
  const rows = await db()
    .select()
    .from(videoSessions)
    .where(
      and(
        eq(videoSessions.creatorId, userId),
        or(isNotNull(videoSessions.recordingUrl), ne(videoSessions.recordingStatus, "none")),
      ),
    )
    .orderBy(desc(videoSessions.createdAt))
    .limit(50);
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  return Promise.all(
    rows.map((s) => (!s.recordingUrl && s.createdAt && s.createdAt > dayAgo ? syncRecording(s) : s)),
  );
}

