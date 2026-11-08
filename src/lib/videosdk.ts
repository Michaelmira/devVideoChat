import "server-only";
import { SignJWT } from "jose";
import { appUrl, env } from "@/lib/env";

export type VideoSdkPermission = "allow_join" | "allow_mod" | "ask_join";

/** Signs a VideoSDK auth token (HS256 with the account secret). */
export async function videoSdkToken(opts: {
  permissions?: VideoSdkPermission[];
  roomId?: string;
  participantId?: string;
  ttlHours?: number;
} = {}): Promise<string> {
  const { VIDEOSDK_API_KEY, VIDEOSDK_SECRET_KEY } = env();
  const payload: Record<string, unknown> = {
    apikey: VIDEOSDK_API_KEY,
    permissions: opts.permissions ?? ["allow_join"],
    version: 2,
  };
  if (opts.roomId) payload.roomId = opts.roomId;
  if (opts.participantId) payload.participantId = opts.participantId;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${opts.ttlHours ?? 6}h`)
    .sign(new TextEncoder().encode(VIDEOSDK_SECRET_KEY));
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await videoSdkToken({ permissions: ["allow_join", "allow_mod"], ttlHours: 1 });
  const res = await fetch(`${env().VIDEOSDK_API_ENDPOINT}${path}`, {
    ...init,
    headers: { Authorization: token, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`VideoSDK ${init.method ?? "GET"} ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export function videoSdkWebhookUrl(): string {
  return `${appUrl()}/api/webhooks/videosdk`;
}

export async function createRoom(opts: { maxMinutes: number }): Promise<{ roomId: string }> {
  const data = await api<{ roomId: string }>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      // Close the room if a session runs past the plan limit (with a small buffer).
      autoCloseConfig: { type: "session-ends", duration: opts.maxMinutes + 5 },
    }),
  });
  if (!data.roomId) throw new Error("VideoSDK did not return a roomId");
  return { roomId: data.roomId };
}

export async function deactivateRoom(roomId: string): Promise<void> {
  await api("/rooms/deactivate", { method: "POST", body: JSON.stringify({ roomId }) });
}

export async function startRecording(roomId: string): Promise<void> {
  await api("/recordings/start", {
    method: "POST",
    body: JSON.stringify({
      roomId,
      webhookUrl: videoSdkWebhookUrl(),
      config: {
        layout: { type: "GRID", priority: "SPEAKER", gridSize: 4 },
        theme: "DARK",
        mode: "video-and-audio",
        quality: "high",
        orientation: "landscape",
      },
    }),
  });
}

export async function stopRecording(roomId: string): Promise<void> {
  await api("/recordings/end", { method: "POST", body: JSON.stringify({ roomId }) });
}

type RecordingListItem = {
  id: string;
  roomId: string;
  sessionId?: string;
  start?: string;
  end?: string;
  file?: { fileUrl?: string };
};

/** Finished recordings for a room, newest first. */
export async function listRecordings(roomId: string): Promise<{ id: string; fileUrl: string; createdAt?: string }[]> {
  const data = await api<{ data?: RecordingListItem[] }>(`/recordings?roomId=${encodeURIComponent(roomId)}`);
  return (data.data ?? [])
    .filter((r) => r.file?.fileUrl)
    .map((r) => ({ id: r.id, fileUrl: r.file!.fileUrl!, createdAt: r.end ?? r.start }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
