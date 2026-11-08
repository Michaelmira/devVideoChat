"use client";

import { Constants, MeetingProvider, useMeeting } from "@videosdk.live/react-sdk";
import {
  Circle,
  Copy,
  Maximize,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Square,
  Timer,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { endSessionAction } from "@/app/actions/sessions";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ParticipantGrid, ParticipantTile } from "./participant-tile";
import { ScreenShareStage } from "./screen-share-stage";
import type { MeetingProps } from "./types";

type Phase = "lobby" | "joining" | "in-call" | "left" | "ended";

export default function MeetingRoom(props: MeetingProps) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);

  if (phase === "lobby") {
    return <Lobby {...props} mic={mic} cam={cam} setMic={setMic} setCam={setCam} onJoin={() => setPhase("joining")} />;
  }
  if (phase === "left" || phase === "ended") {
    return <AfterCall isHost={props.isHost} ended={phase === "ended"} onRejoin={() => setPhase("lobby")} />;
  }
  return (
    <MeetingProvider
      config={{ meetingId: props.meetingId, name: props.name, micEnabled: mic, webcamEnabled: cam, debugMode: false }}
      token={props.token}
      joinWithoutUserInteraction
    >
      <CallView {...props} onJoined={() => setPhase("in-call")} onLeft={(ended) => setPhase(ended ? "ended" : "left")} />
    </MeetingProvider>
  );
}

function Lobby({
  name,
  hostName,
  isHost,
  mic,
  cam,
  setMic,
  setCam,
  onJoin,
}: MeetingProps & {
  mic: boolean;
  cam: boolean;
  setMic: (v: boolean) => void;
  setCam: (v: boolean) => void;
  onJoin: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!cam) return;
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setPermissionError(null);
      })
      .catch(() => setPermissionError("Camera access was blocked. You can still join with audio only."));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cam]);

  return (
    <div className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-white">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{isHost ? "Ready to host?" : `Join ${hostName}'s meeting`}</h1>
          <p className="text-sm text-zinc-400">Joining as {name}</p>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-900">
          {cam && !permissionError ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-zinc-400">{permissionError ?? "Camera is off"}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <RoundToggle on={mic} onClick={() => setMic(!mic)} label={mic ? "Mute microphone" : "Unmute microphone"}>
            {mic ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </RoundToggle>
          <RoundToggle on={cam} onClick={() => setCam(!cam)} label={cam ? "Turn camera off" : "Turn camera on"}>
            {cam ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </RoundToggle>
          <Button size="lg" onClick={onJoin} className="px-8">
            Join now
          </Button>
        </div>
      </div>
    </div>
  );
}

function AfterCall({ isHost, ended, onRejoin }: { isHost: boolean; ended: boolean; onRejoin: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-center text-white">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{ended ? "The meeting has ended" : "You left the meeting"}</h1>
        <div className="flex justify-center gap-3">
          {!ended && (
            <Button variant="secondary" onClick={onRejoin}>
              Rejoin
            </Button>
          )}
          <Link href={isHost ? "/dashboard" : "/"} className={buttonClass("primary")}>
            {isHost ? "Back to dashboard" : "Go to GuildMeet"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoundToggle({
  on,
  danger,
  onClick,
  label,
  children,
  disabled,
}: {
  on: boolean;
  danger?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={cn(
        "grid size-12 place-items-center rounded-full transition disabled:opacity-50",
        danger ? "bg-red-600 text-white hover:bg-red-500" : on ? "bg-zinc-700 text-white hover:bg-zinc-600" : "bg-red-600/90 text-white hover:bg-red-500",
      )}
    >
      {children}
    </button>
  );
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function CallView({
  meetingId,
  isHost,
  canRecord,
  endsAt: initialEndsAt,
  onJoined,
  onLeft,
}: MeetingProps & { onJoined: () => void; onLeft: (ended: boolean) => void }) {
  const endedRef = useRef(false);
  const [endsAt, setEndsAt] = useState(() => new Date(initialEndsAt).getTime());
  const [now, setNow] = useState(() => Date.now());
  const [recordingBusy, setRecordingBusy] = useState(false);
  const warned = useRef(false);

  const {
    participants,
    presenterId,
    localParticipant,
    localMicOn,
    localWebcamOn,
    localScreenShareOn,
    recordingState,
    isMeetingJoined,
    toggleMic,
    toggleWebcam,
    toggleScreenShare,
    leave,
    end,
  } = useMeeting({
    onMeetingJoined: () => {
      onJoined();
      if (isHost) {
        // Starts the plan clock on first join; refresh status to get the real end time.
        fetch(`/api/sessions/${meetingId}/start`, { method: "POST" }).then(() => refreshStatus());
      }
    },
    onMeetingLeft: () => onLeft(endedRef.current),
    onError: ({ code, message }: { code: string; message: string }) => {
      console.error("[meeting]", code, message);
      if (/screen/i.test(message)) toast.error("Screen sharing was blocked or isn't supported in this browser.");
      else if (/token|auth/i.test(message)) toast.error("Your meeting link has expired. Reload the page to rejoin.");
      else toast.error(message || "Something went wrong with the call.");
    },
  });

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${meetingId}/status`, { cache: "no-store" });
      if (!res.ok) return;
      const data: { status: string; endsAt: string } = await res.json();
      setEndsAt(new Date(data.endsAt).getTime());
      if (data.status !== "active") {
        endedRef.current = true;
        leave();
      }
    } catch {
      /* network blip: try again on the next poll */
    }
  }, [meetingId, leave]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(refreshStatus, 30_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [refreshStatus]);

  const remaining = endsAt - now;
  useEffect(() => {
    if (!isMeetingJoined) return;
    if (remaining <= 5 * 60_000 && remaining > 0 && !warned.current) {
      warned.current = true;
      toast.warning("5 minutes left in this meeting.");
    }
    if (remaining <= 0 && !endedRef.current) {
      endedRef.current = true;
      toast.info("This meeting reached its time limit.");
      if (isHost) end();
      else leave();
    }
  }, [remaining, isMeetingJoined, isHost, end, leave]);

  const ids = useMemo(() => [...participants.keys()], [participants]);
  const isRecording = recordingState === Constants.recordingEvents.RECORDING_STARTED;
  const recordingPending =
    recordingState === Constants.recordingEvents.RECORDING_STARTING ||
    recordingState === Constants.recordingEvents.RECORDING_STOPPING;

  async function toggleRecording() {
    setRecordingBusy(true);
    try {
      const res = await fetch(`/api/sessions/${meetingId}/recording`, { method: isRecording ? "DELETE" : "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data.error ?? "Recording request failed.");
      else toast.success(isRecording ? "Recording stopped. It will appear on your dashboard shortly." : "Recording started.");
    } finally {
      setRecordingBusy(false);
    }
  }

  async function endForAll() {
    if (!window.confirm("End the meeting for everyone?")) return;
    endedRef.current = true;
    await endSessionAction(meetingId);
    end();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${meetingId}`);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  if (!isMeetingJoined) {
    return (
      <div className="grid min-h-dvh place-items-center bg-zinc-950 text-zinc-300">
        <p className="animate-pulse">Connecting…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold">GuildMeet</span>
          {(isRecording || recordingPending) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-xs text-red-300">
              <Circle className={cn("size-2 fill-current", isRecording && "animate-pulse")} aria-hidden />
              {isRecording ? "Recording" : "Recording…"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-zinc-300">
          <span className="inline-flex items-center gap-1.5" title="Participants">
            <Users className="size-4" aria-hidden /> {ids.length}
          </span>
          <span
            className={cn("inline-flex items-center gap-1.5 tabular-nums", remaining < 5 * 60_000 && "text-amber-400")}
            title="Time left"
          >
            <Timer className="size-4" aria-hidden /> {formatClock(remaining)}
          </span>
          <button onClick={copyLink} className="inline-flex items-center gap-1.5 hover:text-white" title="Copy invite link">
            <Copy className="size-4" aria-hidden /> <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 px-2 pb-2 sm:px-4">
        {presenterId ? (
          <div className="flex h-full flex-col gap-2 lg:flex-row">
            <div className="min-h-0 flex-1">
              <ScreenShareStage presenterId={presenterId} />
            </div>
            <aside className="flex shrink-0 gap-2 overflow-auto lg:w-56 lg:flex-col">
              {ids.map((id) => (
                <div key={id} className="w-40 shrink-0 lg:w-full">
                  <ParticipantTile participantId={id} compact />
                </div>
              ))}
            </aside>
          </div>
        ) : (
          <ParticipantGrid ids={ids} />
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-3 px-4 py-4">
        <RoundToggle on={localMicOn} onClick={() => toggleMic()} label={localMicOn ? "Mute" : "Unmute"}>
          {localMicOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </RoundToggle>
        <RoundToggle on={localWebcamOn} onClick={() => toggleWebcam()} label={localWebcamOn ? "Stop video" : "Start video"}>
          {localWebcamOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
        </RoundToggle>
        <RoundToggle
          on={!localScreenShareOn}
          onClick={() => toggleScreenShare()}
          disabled={Boolean(presenterId && presenterId !== localParticipant?.id)}
          label={localScreenShareOn ? "Stop presenting" : "Present screen"}
        >
          <MonitorUp className="size-5" />
        </RoundToggle>
        <RoundToggle
          on
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
          label="Toggle full screen"
        >
          <Maximize className="size-5" />
        </RoundToggle>
        {isHost && canRecord && (
          <RoundToggle
            on={!isRecording}
            onClick={toggleRecording}
            disabled={recordingBusy || recordingPending}
            label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <Square className="size-5" /> : <Circle className="size-5 text-red-400" />}
          </RoundToggle>
        )}
        <RoundToggle on danger onClick={() => leave()} label="Leave meeting">
          <PhoneOff className="size-5" />
        </RoundToggle>
        {isHost && (
          <Button variant="danger" onClick={endForAll}>
            End for all
          </Button>
        )}
      </footer>
    </div>
  );
}
