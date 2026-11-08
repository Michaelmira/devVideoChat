"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  resendCodeAction,
  resetPasswordAction,
  verifyCodeAction,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

export function VerifyForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyCodeAction, undefined);
  const [resendState, resend, resending] = useActionState(resendCodeAction, undefined);
  return (
    <div className="space-y-4">
      {state?.error && <Alert tone="error">{state.fieldErrors?.code ?? state.error}</Alert>}
      {resendState?.message && <Alert tone="success">{resendState.message}</Alert>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <Field
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          required
          autoFocus
          className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em] [&_input]:h-14"
        />
        <Button type="submit" className="w-full" loading={pending}>
          Verify email
        </Button>
      </form>
      <form action={resend} className="text-center text-sm text-muted">
        <input type="hidden" name="email" value={email} />
        Didn&apos;t get it?{" "}
        <button className="text-accent hover:underline disabled:opacity-60" disabled={resending}>
          Send a new code
        </button>
      </form>
    </div>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  if (state?.message) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/?signin=1" className="block text-center text-sm text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state?.fieldErrors?.email} />
      <Button type="submit" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetForm({ email, token }: { email: string; token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && !state.fieldErrors && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={state?.fieldErrors?.password}
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.confirm}
      />
      <Button type="submit" className="w-full" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
