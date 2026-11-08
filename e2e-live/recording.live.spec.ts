import { db, expect, signIn, test } from "../e2e/fixtures";
import { joinMeeting, videoSdk } from "./helpers";

test("premium host records a meeting and the file shows up on the dashboard", async ({ browser, page, context }) => {
  // VideoSDK can take a few minutes to process a recording.
  test.setTimeout(8 * 60_000);

  const host = await db.createUser({ premium: true });
  await signIn(context, host);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New meeting" }).click();
  await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
  const [session] = await db.sessionsFor(host.id);
  const meetingId: string = session.meeting_id;

  await joinMeeting(page, `/meeting/${meetingId}`);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  try {
    await guest.goto(`/meeting/${meetingId}?name=Recorded%20Guest`);
    await guest.getByRole("button", { name: "Join now" }).click();
    await guest.getByRole("button", { name: "Leave meeting" }).waitFor({ timeout: 45_000 });

    // Only the premium host gets a record button.
    await expect(guest.getByRole("button", { name: "Start recording" })).toHaveCount(0);

    await page.getByRole("button", { name: "Start recording" }).click();
    // Everyone in the call sees the indicator once VideoSDK confirms.
    await expect(page.getByText("Recording", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(guest.getByText("Recording", { exact: true })).toBeVisible({ timeout: 30_000 });

    await page.waitForTimeout(15_000); // record a little footage

    await page.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.getByText(/Recording stopped/)).toBeVisible();
    await expect(page.getByText("Recording", { exact: true })).toHaveCount(0, { timeout: 60_000 });
    // Stopping the recording must not end the meeting.
    await expect(guest.getByRole("button", { name: "Leave meeting" })).toBeVisible();
    expect((await db.session(meetingId)).status).toBe("active");

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "End for all" }).click();
    await expect(page.getByRole("heading", { name: "The meeting has ended" })).toBeVisible();
  } finally {
    await guestContext.close();
  }

  // Webhooks can't reach localhost, so this exercises the dashboard's fallback sync with VideoSDK.
  await expect
    .poll(
      async () => {
        const list = await videoSdk<{ data: { file?: { fileUrl?: string } }[] }>(`/recordings?roomId=${meetingId}`);
        return list.data.some((r) => r.file?.fileUrl);
      },
      { timeout: 6 * 60_000, intervals: [10_000] },
    )
    .toBe(true);

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Watch" })).toBeVisible();
  const row = await db.session(meetingId);
  expect(row.recording_status).toBe("completed");
  expect(row.recording_url).toMatch(/^https:\/\//);
});
