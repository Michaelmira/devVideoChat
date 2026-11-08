"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { changePasswordAction, updateProfileAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import type { PublicUser } from "@/lib/auth";

function useToast(state: FormState) {
  useEffect(() => {
    if (state?.message) toast.success(state.message);
    else if (state?.error && !state.fieldErrors) toast.error(state.error);
  }, [state]);
}

export function AccountSettings({ user }: { user: PublicUser }) {
  const [profile, saveProfile, savingProfile] = useActionState(updateProfileAction, undefined);
  const [pw, savePw, savingPw] = useActionState(changePasswordAction, undefined);
  useToast(profile);
  useToast(pw);

  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold">Account</h2>
      <form action={saveProfile} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" name="firstName" defaultValue={user.firstName} error={profile?.fieldErrors?.firstName} />
          <Field label="Last name" name="lastName" defaultValue={user.lastName} error={profile?.fieldErrors?.lastName} />
        </div>
        <Field label="Email" name="email" defaultValue={user.email} disabled hint="Contact support to change your email." />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={user.phone === "Not provided" ? "" : user.phone}
          error={profile?.fieldErrors?.phone}
        />
        <Button type="submit" variant="secondary" loading={savingProfile}>
          Save profile
        </Button>
      </form>

      <form action={savePw} className="space-y-4 border-t border-border pt-6" key={pw?.message}>
        <h3 className="font-medium">{user.hasPassword ? "Change password" : "Set a password"}</h3>
        {!user.hasPassword && (
          <p className="text-sm text-muted">You signed up with Google or GitHub. Set a password to also sign in with email.</p>
        )}
        {user.hasPassword && (
          <Field
            label="Current password"
            name="current"
            type="password"
            autoComplete="current-password"
            error={pw?.fieldErrors?.current}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            error={pw?.fieldErrors?.password}
          />
          <Field label="Confirm" name="confirm" type="password" autoComplete="new-password" error={pw?.fieldErrors?.confirm} />
        </div>
        <Button type="submit" variant="secondary" loading={savingPw}>
          {user.hasPassword ? "Update password" : "Set password"}
        </Button>
      </form>
    </Card>
  );
}
