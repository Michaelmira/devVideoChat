"use client";

import { AudioPlayer, VideoPlayer, useParticipant } from "@videosdk.live/react-sdk";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

/** Presenter's screen with zoom and drag-to-pan, so small text stays readable. */
export function ScreenShareStage({ presenterId }: { presenterId: string }) {
  const { displayName, isLocal, screenShareAudioOn } = useParticipant(presenterId);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const setZoomClamped = (z: number) => {
    const next = Math.min(4, Math.max(1, Math.round(z * 4) / 4));
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
      {!isLocal && screenShareAudioOn && <AudioPlayer participantId={presenterId} type="shareAudio" />}
      <div
        className={zoom > 1 ? "h-full w-full cursor-grab active:cursor-grabbing" : "h-full w-full"}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center", touchAction: "none" }}
        onPointerDown={(e) => {
          if (zoom === 1) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          setZoomClamped(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
        }}
      >
        <VideoPlayer
          participantId={presenterId}
          type="share"
          containerStyle={{ width: "100%", height: "100%" }}
          className="h-full w-full"
          classNameVideo="h-full w-full object-contain"
        />
      </div>
      <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        {isLocal ? "You are presenting" : `${displayName} is presenting`}
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 p-1 text-white">
        <button className="rounded p-1.5 hover:bg-white/10" onClick={() => setZoomClamped(zoom - 0.25)} aria-label="Zoom out">
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button className="rounded p-1.5 hover:bg-white/10" onClick={() => setZoomClamped(zoom + 0.25)} aria-label="Zoom in">
          <Plus className="size-4" aria-hidden />
        </button>
        <button className="rounded p-1.5 hover:bg-white/10" onClick={() => setZoomClamped(1)} aria-label="Reset zoom">
          <RotateCcw className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
