"use client";

import dynamic from "next/dynamic";
import type { MeetingProps } from "./types";

// The VideoSDK client touches browser-only APIs, so it never renders on the server.
const MeetingRoom = dynamic(() => import("./meeting-room"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center bg-zinc-950 text-zinc-400">
      <p className="animate-pulse">Loading meeting…</p>
    </div>
  ),
});

export function MeetingClient(props: MeetingProps) {
  return <MeetingRoom {...props} />;
}
