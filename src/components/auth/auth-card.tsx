"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, registerAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { OAuthButtons } from "./oauth-buttons";

type Mode = "signin" | "signup";

export function AuthCard({
  initialMode = "signup",
  providers,
  notice,
  next,
}: {
  initialMode?: Mode;
  providers: { google: boolean; github: boolean };
  notice?: { tone: "info" | "error" | "success"; text: string };
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return (
    <Card id="auth" className="w-full max-w-md p-0">
      <div className="grid grid-cols-2 border-b border-border text-sm font-medium" role="tablist">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-12 transition",
              mode === m ? "border-b-2 border-accent text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
      <div className="space-y-4 p-6">
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <OAuthButtons {...providers} next={next} />
        {mode === "signup" ? <SignUpForm /> : <SignInForm next={next} />}
      </div>
    </Card>
  );
}

function FormError({ state }: { state: FormState }) {
  if (!state?.error || state.fieldErrors) return null;
  return <Alert tone="error">{state.error}</Alert>;
}

function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state?.fieldErrors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" name="firstName" autoComplete="given-name" required error={fe?.firstName} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required error={fe?.lastName} />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" required error={fe?.email} />
      <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" error={fe?.phone} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={fe?.password}
      />
      <Button type="submit" className="w-full" loading={pending}>
        Create free account
      </Button>
      <p className="text-center text-xs text-muted">We&apos;ll email you a 6-digit code to confirm your address.</p>
    </form>
  );
}
