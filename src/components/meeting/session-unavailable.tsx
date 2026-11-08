import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SessionUnavailable({ reason }: { reason: "not-found" | "ended" | "expired" }) {
  const copy = {
    "not-found": ["Meeting not found", "Check the link with the person who invited you."],
    ended: ["This meeting has ended", "The host ended the meeting. Ask them for a new link if you need to reconnect."],
    expired: ["This link has expired", "Meeting links stop working after the time limit. Ask the host for a new link."],
  }[reason];
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="text-xl font-semibold">{copy[0]}</h1>
        <p className="text-sm text-muted">{copy[1]}</p>
        <Link href="/" className={buttonClass("secondary")}>
          Go to GuildMeet
        </Link>
      </Card>
    </div>
  );
}
