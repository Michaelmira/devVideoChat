import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { authorizationUrl, isProvider, providerConfigured } from "@/lib/oauth";

const OAUTH_STATE_COOKIE = "gm_oauth_state";

/** Starts Google/GitHub sign-in: sets a state cookie and redirects to the provider. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider) || !providerConfigured(provider)) {
    return NextResponse.redirect(`${appUrl()}/?auth_error=provider_unavailable`);
  }
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, provider, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(authorizationUrl(provider, state));
}
