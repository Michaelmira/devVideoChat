"use client";

import { AudioPlayer, VideoPlayer, useParticipant } from "@videosdk.live/react-sdk";
import { MicOff } from "lucide-react";
import { cn } from "@/lib/cn";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ParticipantTile({ participantId, compact = false }: { participantId: string; compact?: boolean }) {
  const { displayName, webcamOn, micOn, isLocal, isActiveSpeaker } = useParticipant(participantId);
  const label = `${displayName || "Guest"}${isLocal ? " (you)" : ""}`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-zinc-800 ring-2 ring-transparent transition",
        isActiveSpeaker && micOn && "ring-accent",
        compact ? "aspect-video w-full" : "h-full min-h-0 w-full",
      )}
    >
      {!isLocal && micOn && <AudioPlayer participantId={participantId} type="audio" />}
      {webcamOn ? (
        <VideoPlayer
          participantId={participantId}
          type="video"
          containerStyle={{ width: "100%", height: "100%" }}
          className="h-full w-full"
          classNameVideo={cn("h-full w-full object-cover", isLocal && "-scale-x-100")}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <span
            className={cn(
              "grid place-items-center rounded-full bg-accent font-semibold text-white",
              compact ? "size-10 text-sm" : "size-20 text-2xl",
            )}
          >
            {initials(displayName || "Guest") || "?"}
          </span>
        </div>
      )}
      <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
        <span className="max-w-full truncate rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">{label}</span>
        {!micOn && (
          <span className="rounded-md bg-black/60 p-1 text-red-400" aria-label="Muted">
            <MicOff className="size-3" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

/** Lays out tiles in a grid that fills the stage. */
export function ParticipantGrid({ ids }: { ids: string[] }) {
  const n = ids.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  return (
    <div
      className="grid h-full w-full gap-2 sm:gap-3"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {ids.map((id) => (
        <ParticipantTile key={id} participantId={id} />
      ))}
    </div>
  );
}
