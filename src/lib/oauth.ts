import "server-only";
import { appUrl, env } from "@/lib/env";

export type OAuthProvider = "google" | "github";

export type OAuthProfile = {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

export function isProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export function providerConfigured(p: OAuthProvider): boolean {
  const e = env();
  return p === "google"
    ? Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET)
    : Boolean(e.GITHUB_CLIENT_ID && e.GITHUB_CLIENT_SECRET);
}

export function callbackUrl(p: OAuthProvider): string {
  return `${appUrl()}/api/auth/${p}/callback`;
}

export function authorizationUrl(p: OAuthProvider, state: string): string {
  const e = env();
  if (p === "google") {
    const q = new URLSearchParams({
      client_id: e.GOOGLE_CLIENT_ID!,
      redirect_uri: callbackUrl(p),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  const q = new URLSearchParams({
    client_id: e.GITHUB_CLIENT_ID!,
    redirect_uri: callbackUrl(p),
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${q}`;
}

function splitName(full: string | null | undefined): [string, string] {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["", ""];
  return [parts[0], parts.slice(1).join(" ")];
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`${what} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchProfile(p: OAuthProvider, code: string): Promise<OAuthProfile> {
  const e = env();
  if (p === "google") {
    const token = await json<{ access_token?: string }>(
      await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: e.GOOGLE_CLIENT_ID!,
          client_secret: e.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl(p),
        }),
      }),
      "Google token exchange",
    );
    if (!token.access_token) throw new Error("Google returned no access token");
    const info = await json<{
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
    }>(
      await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }),
      "Google userinfo",
    );
    if (!info.email) throw new Error("Google account has no email");
    const [first, last] = splitName(info.name);
    return {
      email: info.email.toLowerCase(),
      emailVerified: info.email_verified === true,
      firstName: info.given_name ?? first,
      lastName: info.family_name ?? last,
    };
  }

  const token = await json<{ access_token?: string; error?: string }>(
    await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: e.GITHUB_CLIENT_ID,
        client_secret: e.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl(p),
      }),
    }),
    "GitHub token exchange",
  );
  if (!token.access_token) throw new Error(`GitHub token exchange failed: ${token.error ?? "no token"}`);
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "GuildMeet",
  };
  const [user, emails] = await Promise.all([
    fetch("https://api.github.com/user", { headers }).then((r) =>
      json<{ name?: string | null; login: string }>(r, "GitHub user"),
    ),
    fetch("https://api.github.com/user/emails", { headers }).then((r) =>
      json<{ email: string; primary: boolean; verified: boolean }[]>(r, "GitHub emails"),
    ),
  ]);
  const primary = emails.find((m) => m.primary && m.verified) ?? emails.find((m) => m.verified);
  if (!primary) throw new Error("GitHub account has no verified email");
  const [first, last] = splitName(user.name ?? user.login);
  return { email: primary.email.toLowerCase(), emailVerified: true, firstName: first, lastName: last };
}
