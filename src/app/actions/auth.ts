"use server";

import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  MAX_CODE_ATTEMPTS,
  RESET_TTL_MS,
  VERIFICATION_TTL_MS,
  resetToken,
  sha256,
  sixDigitCode,
} from "@/lib/codes";
import { db, users } from "@/lib/db";
import { sendPasswordReset, sendVerificationCode } from "@/lib/email";
import { appUrl, env } from "@/lib/env";
import { OAUTH_ONLY_PASSWORD, hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { findUserByEmail, normalizeEmail } from "@/lib/users";

export type FormState = { error?: string; message?: string; fieldErrors?: Record<string, string> } | undefined;

function fieldErrors(error: z.ZodError): FormState {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return { fieldErrors: out, error: "Please fix the highlighted fields." };
}

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(30, "At most 30 characters"),
  lastName: z.string().trim().min(1, "Required").max(30, "At most 30 characters"),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  password,
});

async function issueVerificationCode(userId: number, email: string) {
  const code = sixDigitCode();
  await db()
    .update(users)
    .set({
      verificationCode: code,
      verificationCodeExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
      codeAttempts: 0,
    })
    .where(eq(users.id, userId));
  await sendVerificationCode(email, code);
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const data = parsed.data;
  const email = normalizeEmail(data.email);

  const existing = await findUserByEmail(email);
  if (existing?.isVerified) {
    return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  }

  const passwordHash = await hashPassword(data.password);
  let userId: number;
  if (existing) {
    // Unverified leftover registration: let the real owner claim it.
    await db()
      .update(users)
      .set({ firstName: data.firstName, lastName: data.lastName, phone: data.phone || "Not provided", password: passwordHash })
      .where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db()
      .insert(users)
      .values({
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "Not provided",
        password: passwordHash,
        isVerified: false,
        isActive: true,
        subscriptionStatus: "free",
      })
      .returning({ id: users.id });
    userId = created.id;
  }
  await issueVerificationCode(userId, email);
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
  next: z.string().optional(),
});

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password: pw, next } = parsed.data;

  const user = await findUserByEmail(email);
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  // "oauth_user" was the placeholder password the Flask app gave OAuth sign-ups.
  if (!user || pw === "oauth_user" || !(await verifyPassword(pw, user.password))) {
    return { error: "Incorrect email or password." };
  }
  if (user.isActive === false) return { error: "This account is disabled." };
  if (!user.isVerified) {
    await issueVerificationCode(user.id, user.email);
    redirect(`/verify?email=${encodeURIComponent(user.email)}`);
  }
  await db().update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  redirect(safeNext(next));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const verifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export async function verifyCodeAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, code } = parsed.data;
  const user = await findUserByEmail(email);
  if (!user) return { error: "Invalid or expired code." };
  if (user.isVerified) redirect("/?signin=1&verified=1");

  // Developer bypass: only outside production, and only if explicitly configured.
  const bypass = env().VERIFICATION_BYPASS_CODE;
  const bypassOk = env().NODE_ENV !== "production" && Boolean(bypass) && code === bypass;

  if (!bypassOk) {
    if (user.codeAttempts >= MAX_CODE_ATTEMPTS) {
      return { error: "Too many attempts. Send a new code and try again." };
    }
    const expired = user.verificationCodeExpires !== null && user.verificationCodeExpires < new Date();
    if (!user.verificationCode || expired || user.verificationCode !== code) {
      await db().update(users).set({ codeAttempts: user.codeAttempts + 1 }).where(eq(users.id, user.id));
      return { error: expired ? "That code has expired. Send a new one." : "Invalid or expired code." };
    }
  }

  await db()
    .update(users)
    .set({ isVerified: true, verificationCode: null, verificationCodeExpires: null, codeAttempts: 0, lastActive: new Date() })
    .where(eq(users.id, user.id));
  await createSession(user.id);
  redirect("/dashboard?welcome=1");
}

export async function resendCodeAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const user = email ? await findUserByEmail(email) : undefined;
  if (user && !user.isVerified) await issueVerificationCode(user.id, user.email);
  return { message: "If that account needs verifying, a new code is on its way." };
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.string().trim().email("Enter a valid email") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const user = await findUserByEmail(parsed.data.email);
  if (user && user.isVerified) {
    const { token, hash } = resetToken();
    await db()
      .update(users)
      .set({ passwordResetHash: hash, passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) })
      .where(eq(users.id, user.id));
    const link = `${appUrl()}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendPasswordReset(user.email, link);
  }
  return { message: "If an account exists for that email, we've sent a reset link." };
}

const resetSchema = z
  .object({ email: z.string().email(), token: z.string().length(64), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, token, password: pw } = parsed.data;
  const user = await findUserByEmail(email);
  if (!user) return { error: "This reset link is invalid or has expired." };
  const [updated] = await db()
    .update(users)
    .set({ password: await hashPassword(pw), passwordResetHash: null, passwordResetExpires: null })
    .where(and(eq(users.id, user.id), eq(users.passwordResetHash, sha256(token)), gt(users.passwordResetExpires, new Date())))
    .returning({ id: users.id });
  if (!updated) return { error: "This reset link is invalid or has expired." };
  redirect("/?signin=1&reset=1");
}

const changeSchema = z
  .object({ current: z.string().optional().default(""), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has ended. Sign in again." };
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const hasPassword = user.password !== OAUTH_ONLY_PASSWORD && user.password.split("$").length === 3;
  if (hasPassword && !(await verifyPassword(parsed.data.current, user.password))) {
    return { fieldErrors: { current: "Current password is incorrect" } };
  }
  await db().update(users).set({ password: await hashPassword(parsed.data.password) }).where(eq(users.id, user.id));
  return { message: hasPassword ? "Password updated." : "Password set. You can now also sign in with email." };
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(30),
  lastName: z.string().trim().min(1, "Required").max(30),
  phone: z.string().trim().max(30).optional().default(""),
});

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has ended. Sign in again." };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db()
    .update(users)
    .set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone || "Not provided" })
    .where(eq(users.id, user.id));
  return { message: "Profile saved." };
}
