import { db, expect, mock, signIn, test, expectToast } from "./fixtures";

test.describe("meetings on the dashboard", () => {
  test("dashboard requires sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/\?signin=1/);
  });

  test("create a meeting: VideoSDK room + DB row + link shown", async ({ authedPage: page, user }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("No active meeting")).toBeVisible();
    await page.getByRole("button", { name: "New meeting" }).click();
    await expectToast(page, "Meeting created");

    const [session] = await db.sessionsFor(user.id);
    expect(session.status).toBe("active");
    expect(session.max_duration_minutes).toBe(70);
    expect(session.started_at).toBeNull();
    expect(new Date(session.expires_at).getTime() - Date.now()).toBeGreaterThan(5.9 * 3600_000);

    const link = page.getByLabel("Meeting link", { exact: true });
    await expect(link).toHaveValue(`http://localhost:3100/join/${session.meeting_id}`);
    await expect(page.getByRole("button", { name: "New meeting" })).toHaveCount(0);

    const rooms = await mock.rooms();
    expect(rooms[session.meeting_id]).toEqual({ active: true, recording: false });
  });

  test("room is created with a plan-based auto-close and no auto-recording", async ({ authedPage: page, user }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New meeting" }).click();
    await expectToast(page, "Meeting created");
    const [session] = await db.sessionsFor(user.id);
    const creates = (await mock.calls("videosdk")).filter((c) => c.path === "/rooms");
    const body = creates.at(-1)!.body as Record<string, unknown>;
    expect(body.autoCloseConfig).toEqual({ type: "session-ends", duration: 75 });
    expect(body).not.toHaveProperty("autoStartRecording");
    expect(session.meeting_id).toBeTruthy();
  });

  test("premium meetings get 360 minutes", async ({ page, context, premiumUser }) => {
    await signIn(context, premiumUser);
    await page.goto("/dashboard");
    await expect(page.getByText("Meetings run up to 6 hours")).toBeVisible();
    await page.getByRole("button", { name: "New meeting" }).click();
    await expectToast(page, "Meeting created");
    const [session] = await db.sessionsFor(premiumUser.id);
    expect(session.max_duration_minutes).toBe(360);
  });

  test("only one active meeting at a time", async ({ authedPage: page, user }) => {
    await db.createSession(user.id);
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "New meeting" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Join as host" })).toHaveCount(1);
  });

  test("expired meetings disappear and are marked expired", async ({ authedPage: page, user }) => {
    const meetingId = await db.createSession(user.id, { startedMinutesAgo: 71, maxDurationMinutes: 70 });
    await page.goto("/dashboard");
    await expect(page.getByText("No active meeting")).toBeVisible();
    expect((await db.session(meetingId)).status).toBe("expired");
  });

  test("end meeting: confirm, row ended, room deactivated", async ({ authedPage: page, user }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New meeting" }).click();
    await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
    const [session] = await db.sessionsFor(user.id);

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "End meeting" }).click();
    await expectToast(page, "Meeting ended.");
    await expect(page.getByText("No active meeting")).toBeVisible();
    expect((await db.session(session.meeting_id)).status).toBe("ended");
    expect((await mock.rooms())[session.meeting_id].active).toBe(false);
  });

  test("dismissing the confirm keeps the meeting", async ({ authedPage: page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto("/dashboard");
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "End meeting" }).click();
    await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
    expect((await db.session(meetingId)).status).toBe("active");
  });

  test("copy puts the join link on the clipboard", async ({ authedPage: page, user, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const meetingId = await db.createSession(user.id);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Copy meeting link" }).click();
    await expect(page.getByRole("button", { name: "Copy meeting link" })).toContainText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3100/join/${meetingId}`);
  });
});

test.describe("plan card", () => {
  test("free users see the upgrade offer", async ({ authedPage: page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Upgrade to Premium" })).toBeVisible();
    await expect(page.getByText("$3")).toBeVisible();
    await expect(page.getByText("Upgrade to Premium to record meetings")).toBeVisible();
  });

  test("premium users see renewal date and recordings", async ({ page, context, premiumUser }) => {
    await signIn(context, premiumUser);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Premium", exact: true })).toBeVisible();
    await expect(page.getByText(/Renews on/)).toBeVisible();
    await expect(page.getByText("No recordings yet")).toBeVisible();
  });
});
