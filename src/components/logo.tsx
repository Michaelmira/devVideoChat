import { Video } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Video className="size-4" aria-hidden />
      </span>
      GuildMeet
    </Link>
  );
}
