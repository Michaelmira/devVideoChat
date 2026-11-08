"use client";

import { Check, Copy, ExternalLink, Plus, Square, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSessionAction, endSessionAction } from "@/app/actions/sessions";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SessionDTO } from "@/lib/sessions";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatLeft(ms: number) {
  if (ms <= 0) return "ended";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min left`;
  return `${Math.floor(m / 60)} h ${m % 60} min left`;
}

function formatPlan(minutes: number) {
  return minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hours` : `${minutes} minutes`;
}

export function SessionsPanel({ sessions, planMinutes }: { sessions: SessionDTO[]; planMinutes: number }) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();
  const now = useNow();

  function create() {
    startCreate(async () => {
      const res = await createSessionAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Meeting created. Share the link with your guests.");
      router.refresh();
    });
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your meeting</h2>
          <p className="text-sm text-muted">
            Meetings run up to {formatPlan(planMinutes)} once you join as host. Links expire after 6 hours.
          </p>
        </div>
        {sessions.length === 0 && (
          <Button onClick={create} loading={creating}>
            <Plus className="size-4" aria-hidden /> New meeting
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No active meeting. Create one to get a link you can share.
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <SessionRow key={s.meetingId} session={s} now={now} onEnded={() => router.refresh()} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function SessionRow({ session, now, onEnded }: { session: SessionDTO; now: number; onEnded: () => void }) {
  const [copied, setCopied] = useState(false);
  const [ending, startEnd] = useTransition();
  const left = new Date(session.endsAt).getTime() - now;

  async function copy() {
    try {
      await navigator.clipboard.writeText(session.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  }

  function end() {
    if (!window.confirm("End this meeting for everyone? The link will stop working.")) return;
    startEnd(async () => {
      const res = await endSessionAction(session.meetingId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Meeting ended.");
      onEnded();
    });
  }

  return (
    <li className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          {session.startedAt ? "In progress" : "Ready"}
        </span>
        <span className="inline-flex items-center gap-1 text-muted">
          <Timer className="size-4" aria-hidden /> {formatLeft(left)}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={session.joinUrl}
          aria-label="Meeting link"
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-xs"
        />
        <Button variant="secondary" onClick={copy} aria-label="Copy meeting link">
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/meeting/${session.meetingId}`} className={buttonClass("primary")}>
          <ExternalLink className="size-4" aria-hidden /> Join as host
        </Link>
        <Button variant="secondary" onClick={end} loading={ending}>
          <Square className="size-4" aria-hidden /> End meeting
        </Button>
      </div>
    </li>
  );
}
