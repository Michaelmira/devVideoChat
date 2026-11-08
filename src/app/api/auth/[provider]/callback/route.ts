import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { fetchProfile, isProvider } from "@/lib/oauth";
import { OAUTH_ONLY_PASSWORD } from "@/lib/password";
import { createSession } from "@/lib/session";
import { findUserByEmail } from "@/lib/users";

const STATE_COOKIE = "gm_oauth_state";

function fail(reason: string) {
  return NextResponse.redirect(`${appUrl()}/?auth_error=${encodeURIComponent(reason)}`);
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return fail("provider_unavailable");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  const state = params.get("state");

  const jar = await cookies();
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  let saved: { state?: string; provider?: string; next?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    /* treated as missing */
  }
  if (!code || !state || saved.state !== state || saved.provider !== provider) {
    return fail("invalid_state");
  }

  let profile;
  try {
    profile = await fetchProfile(provider, code);
  } catch (err) {
    console.error(`[oauth:${provider}]`, err);
    return fail("provider_error");
  }
  if (!profile.emailVerified) return fail("email_not_verified");

  let user = await findUserByEmail(profile.email);
  if (user) {
    if (user.isActive === false) return fail("account_disabled");
    if (!user.isVerified) {
      // The provider proved ownership of this email. Drop any password set by an
      // unverified sign-up so whoever created it can't get into this account.
      await db()
        .update(users)
        .set({ isVerified: true, verificationCode: null, password: OAUTH_ONLY_PASSWORD })
        .where(eq(users.id, user.id));
    }
  } else {
    [user] = await db()
      .insert(users)
      .values({
        email: profile.email,
        firstName: (profile.firstName || profile.email.split("@")[0]).slice(0, 30),
        lastName: (profile.lastName || "-").slice(0, 30),
        phone: "Not provided",
        password: OAUTH_ONLY_PASSWORD,
        isVerified: true,
        isActive: true,
        subscriptionStatus: "free",
      })
      .returning();
  }

  await db().update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  const next = saved.next && saved.next.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/dashboard";
  return NextResponse.redirect(`${appUrl()}${next}`);
}
