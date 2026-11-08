import { db, expect, signIn, test } from "./fixtures";

test.describe("join page", () => {
  test("guest enters a name and reaches the lobby", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto(`/join/${meetingId}`);
    await expect(page.getByRole("heading", { name: "Ada invited you to a meeting" })).toBeVisible();
    await expect(page.getByText("Waiting to start")).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter a name between 1 and 40 characters.")).toBeVisible();

    await page.getByLabel("Your name").fill("Guest Grace");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(new RegExp(`/meeting/${meetingId}\\?name=Guest`));
    await expect(page.getByRole("heading", { name: "Join Ada's meeting" })).toBeVisible();
    await expect(page.getByText("Joining as Guest Grace")).toBeVisible();
  });

  test("shows minutes left once the meeting has started", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id, { startedMinutesAgo: 10, maxDurationMinutes: 70 });
    await page.goto(`/join/${meetingId}`);
    await expect(page.getByText(/In progress · (59|60) min left/)).toBeVisible();
  });

  test("signed-in guests get their name prefilled", async ({ page, context, user }) => {
    const host = await db.createUser({ firstName: "Hostie" });
    const meetingId = await db.createSession(host.id);
    await signIn(context, user);
    await page.goto(`/join/${meetingId}`);
    await expect(page.getByLabel("Your name")).toHaveValue("Ada Tester");
  });

  test("the host skips the join form", async ({ authedPage: page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto(`/join/${meetingId}`);
    await expect(page).toHaveURL(new RegExp(`/meeting/${meetingId}$`));
    await expect(page.getByRole("heading", { name: "Ready to host?" })).toBeVisible();
    await expect(page.getByText("Joining as Ada Tester")).toBeVisible();
  });

  test("unknown, ended and expired links explain themselves", async ({ page, user }) => {
    await page.goto("/join/zzzz-zzzz-zzzz");
    await expect(page.getByRole("heading", { name: "Meeting not found" })).toBeVisible();

    const ended = await db.createSession(user.id, { status: "ended" });
    await page.goto(`/join/${ended}`);
    await expect(page.getByRole("heading", { name: "This meeting has ended" })).toBeVisible();

    const expired = await db.createSession(user.id, { expiresInMinutes: -1 });
    await page.goto(`/join/${expired}`);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    expect((await db.session(expired)).status).toBe("expired");

    const timedOut = await db.createSession(user.id, { startedMinutesAgo: 80, maxDurationMinutes: 70 });
    await page.goto(`/meeting/${timedOut}?name=Late`);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  });

  test("links from the old app redirect to the join page", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto(`/video-meeting/${meetingId}`);
    await expect(page).toHaveURL(new RegExp(`/join/${meetingId}$`));
  });
});

test.describe("meeting lobby", () => {
  test("guests without a name are sent back to the join form", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto(`/meeting/${meetingId}`);
    await expect(page).toHaveURL(new RegExp(`/join/${meetingId}$`));
  });

  test("long names are trimmed to 40 characters", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto(`/meeting/${meetingId}?name=${"x".repeat(60)}`);
    await expect(page.getByText(`Joining as ${"x".repeat(40)}`, { exact: true })).toBeVisible();
  });

  test("camera preview and mic/camera toggles", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id);
    await page.goto(`/meeting/${meetingId}?name=Tester`);
    const preview = page.locator("video");
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);

    const mic = page.getByRole("button", { name: "Mute microphone" });
    await expect(mic).toHaveAttribute("aria-pressed", "true");
    await mic.click();
    await expect(page.getByRole("button", { name: "Unmute microphone" })).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Turn camera off" }).click();
    await expect(page.getByText("Camera is off")).toBeVisible();
    await expect(page.locator("video")).toHaveCount(0);
  });

  test("the guest token is join-only and scoped to the room", async ({ page, user }) => {
    const meetingId = await db.createSession(user.id);
    const html = await (await page.request.get(`/meeting/${meetingId}?name=Guest`)).text();
    const token = html.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/)?.[0];
    expect(token).toBeTruthy();
    const payload = JSON.parse(Buffer.from(token!.split(".")[1], "base64url").toString());
    expect(payload.roomId).toBe(meetingId);
    expect(payload.permissions).toEqual(["allow_join"]);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(7 * 3600);
  });

  test("the host token has moderator rights", async ({ authedPage: page, user }) => {
    const meetingId = await db.createSession(user.id);
    const html = await (await page.request.get(`/meeting/${meetingId}`)).text();
    const token = html.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/)?.[0];
    const payload = JSON.parse(Buffer.from(token!.split(".")[1], "base64url").toString());
    expect(payload.permissions).toEqual(["allow_join", "allow_mod"]);
    expect(payload.roomId).toBe(meetingId);
  });
});
