import type { Browser, BrowserContext, Page } from "@playwright/test";
import { SignJWT } from "jose";
import Stripe from "stripe";
import { liveKeys } from "./live-env";

/** Direct VideoSDK API access, to check what the app did. */
export async function videoSdk<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await new SignJWT({ apikey: liveKeys.VIDEOSDK_API_KEY, permissions: ["allow_join", "allow_mod"], version: 2 })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(liveKeys.VIDEOSDK_SECRET_KEY));
  const res = await fetch(`https://api.videosdk.live/v2${path}`, {
    ...init,
    headers: { Authorization: token, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`VideoSDK ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const stripe = new Stripe(
  liveKeys.STRIPE_SECRET_KEY,
  process.env.NODE_USE_ENV_PROXY ? { httpClient: Stripe.createFetchHttpClient() } : {},
);

/** Opens the meeting page and joins from the lobby. */
export async function joinMeeting(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole("button", { name: "Join now" }).click();
  // In-call controls appear once VideoSDK reports the meeting as joined.
  await page.getByRole("button", { name: "Leave meeting" }).waitFor({ timeout: 45_000 });
}

export async function newContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext();
}

/** Number shown next to the participants icon in the call header. */
export function participantCount(page: Page) {
  return page.getByTitle("Participants");
}

/** True when a <video> on the page is actually receiving frames. */
export async function hasPlayingVideo(page: Page, selector = "main video"): Promise<boolean> {
  return page.evaluate(async (sel) => {
    const videos = [...document.querySelectorAll<HTMLVideoElement>(sel)];
    for (const v of videos) {
      if (v.readyState >= 2 && v.videoWidth > 0) {
        const t = v.currentTime;
        await new Promise((r) => setTimeout(r, 600));
        if (v.currentTime > t) return true;
      }
    }
    return false;
  }, selector);
}
