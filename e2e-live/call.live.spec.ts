import { db, expect, signIn, test } from "../e2e/fixtures";
import { hasPlayingVideo, joinMeeting, participantCount, videoSdk } from "./helpers";

test("creating a meeting makes a real VideoSDK room; ending it deactivates the room", async ({ page, context, user }) => {
  await signIn(context, user);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New meeting" }).click();
  await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
  const [session] = await db.sessionsFor(user.id);

  const room = await videoSdk<{ roomId: string; disabled: boolean; autoCloseConfig?: { type: string; duration: number } }>(
    `/rooms/${session.meeting_id}`,
  );
  expect(room.roomId).toBe(session.meeting_id);
  expect(room.disabled).toBe(false);
  expect(room.autoCloseConfig).toEqual({ type: "session-ends", duration: 75 });

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "End meeting" }).click();
  await expect(page.getByText("No active meeting")).toBeVisible();
  await expect.poll(async () => (await videoSdk<{ disabled: boolean }>(`/rooms/${session.meeting_id}`)).disabled).toBe(true);
});

test("host and guest join, see and hear each other, and end the meeting", async ({ browser, page, context, user }) => {
  await signIn(context, user);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New meeting" }).click();
  await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
  const [session] = await db.sessionsFor(user.id);
  const meetingId: string = session.meeting_id;

  // Host joins.
  await joinMeeting(page, `/meeting/${meetingId}`);
  await expect(participantCount(page)).toHaveText("1");
  await expect.poll(async () => (await db.session(meetingId)).started_at).not.toBeNull();

  // Guest joins from the public link in a separate browser profile.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  try {
    await guest.goto(`/join/${meetingId}`);
    await guest.getByLabel("Your name").fill("Live Guest");
    await guest.getByRole("button", { name: "Continue" }).click();
    await guest.getByRole("button", { name: "Join now" }).click();
    await guest.getByRole("button", { name: "Leave meeting" }).waitFor({ timeout: 45_000 });

    await expect(participantCount(page)).toHaveText("2");
    await expect(participantCount(guest)).toHaveText("2");
    await expect(page.getByText("Live Guest")).toBeVisible();
    await expect(guest.getByText("Ada Tester")).toBeVisible();

    // Video frames are flowing both ways (fake camera).
    await expect.poll(() => hasPlayingVideo(page), { timeout: 30_000 }).toBe(true);
    await expect.poll(() => hasPlayingVideo(guest), { timeout: 30_000 }).toBe(true);
    // The guest receives the host's audio.
    await expect(guest.locator("audio")).not.toHaveCount(0);

    // Guests don't get host-only controls.
    await expect(guest.getByRole("button", { name: "End for all" })).toHaveCount(0);

    // Muting shows up for the other person.
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(guest.getByLabel("Muted")).toBeVisible();
    await page.getByRole("button", { name: "Unmute" }).click();
    await expect(guest.getByLabel("Muted")).toHaveCount(0);

    // Screen sharing from the guest moves everyone to the presenter layout.
    await guest.getByRole("button", { name: "Present screen" }).click();
    await expect(page.getByText("Live Guest is presenting")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Present screen" })).toBeDisabled();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByText("125%")).toBeVisible();
    await guest.getByRole("button", { name: "Stop presenting" }).click();
    await expect(page.getByText("Live Guest is presenting")).toHaveCount(0, { timeout: 30_000 });

    // Host ends the meeting for everyone.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "End for all" }).click();
    await expect(page.getByRole("heading", { name: "The meeting has ended" })).toBeVisible();
    await expect(guest.getByRole("heading", { name: /The meeting has ended|You left the meeting/ })).toBeVisible({
      timeout: 30_000,
    });
    expect((await db.session(meetingId)).status).toBe("ended");

    // The link no longer works.
    await guest.goto(`/join/${meetingId}`);
    await expect(guest.getByRole("heading", { name: "This meeting has ended" })).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
