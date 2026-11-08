"use client";

import { Clapperboard, Download, Loader2, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type RecordingItem = {
  meetingId: string;
  createdAt: string | null;
  status: string;
  url: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  starting: "Starting…",
  active: "Recording…",
  stopping: "Processing…",
  processing: "Processing…",
  failed: "Failed",
  completed: "Ready",
};

export function RecordingsList({ recordings, enabled }: { recordings: RecordingItem[]; enabled: boolean }) {
  const [playing, setPlaying] = useState<RecordingItem | null>(null);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <Clapperboard className="size-5 text-accent" aria-hidden />
        <h2 className="text-lg font-semibold">Recordings</h2>
      </div>
      {!enabled ? (
        <p className="text-sm text-muted">Upgrade to Premium to record meetings and watch them here.</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-muted">
          No recordings yet. Use the record button in a meeting you host. Recordings show up here a few minutes after
          you stop them.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recordings.map((r) => (
            <li key={r.meetingId} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : "Meeting"}
                </p>
                <p className="text-xs text-muted">{STATUS_LABEL[r.status] ?? r.status}</p>
              </div>
              {r.url ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPlaying(r)}>
                    <Play className="size-4" aria-hidden /> Watch
                  </Button>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border hover:bg-accent-soft"
                    aria-label="Open recording file"
                  >
                    <Download className="size-4" aria-hidden />
                  </a>
                </div>
              ) : r.status !== "failed" ? (
                <Loader2 className="size-4 animate-spin text-muted" aria-label="Processing" />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {playing?.url && <PlayerDialog url={playing.url} onClose={() => setPlaying(null)} />}
    </Card>
  );
}

function PlayerDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Older recordings from the Flask app are HLS streams; new ones are MP4.
    const isHls = /\.m3u8(\?|$)/i.test(url);
    if (!isHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }
    let destroyed = false;
    let hls: import("hls.js").default | undefined;
    import("hls.js").then(({ default: Hls }) => {
      if (destroyed) return;
      if (!Hls.isSupported()) {
        setError("This browser can't play this recording.");
        return;
      }
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError("This recording couldn't be loaded. It may have expired.");
      });
    });
    return () => {
      destroyed = true;
      hls?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recording player"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
        >
          <X className="size-4" aria-hidden /> Close
        </button>
        {error ? (
          <div className="rounded-xl bg-black p-10 text-center text-white">{error}</div>
        ) : (
          <video ref={ref} controls autoPlay playsInline className="aspect-video w-full rounded-xl bg-black" />
        )}
      </div>
    </div>
  );
}
