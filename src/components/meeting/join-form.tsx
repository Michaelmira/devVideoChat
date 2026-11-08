"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function JoinForm({ meetingId, defaultName }: { meetingId: string; defaultName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName ?? "");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 1 || trimmed.length > 40) {
          setError("Enter a name between 1 and 40 characters.");
          return;
        }
        setPending(true);
        router.push(`/meeting/${encodeURIComponent(meetingId)}?name=${encodeURIComponent(trimmed)}`);
      }}
    >
      <Field
        label="Your name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        maxLength={40}
        autoFocus
        error={error}
        hint="This is how others will see you in the meeting."
      />
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Continue
      </Button>
    </form>
  );
}
