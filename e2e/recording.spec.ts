import { APP_URL } from "./env";
import { db, expect, mock, signIn, test } from "./fixtures";

test.describe("recording API permissions", () => {
  test("signed-out callers are rejected", async ({ request, user }) => {
    const meetingId = await db.createSession(user.id);
    const res = await request.post(`/api/sessions/${meetingId}/recording`);
    expect(res.status()).toBe(401);
  });

  test("free hosts can't record (the old app's bug made nobody able to)", async ({ authedPage: page, user }) => {
    const meetingId = await db.createSession(user.id);
    const res = await page.request.post(`/api/sessions/${meetingId}/recording`);
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "Recording is a Premium feature" });
  });

  test("premium users can't record someone else's meeting", async ({ page, context, premiumUser, user }) => {
    const meetingId = await db.createSession(user.id);
    await signIn(context, premiumUser);
    const res = await page.request.post(`/api/sessions/${meetingId}/recording`);
    expect(res.status()).toBe(403);
  });

  test("can't record a meeting that is over", async ({ page, context, premiumUser }) => {
    const meetingId = await db.createSession(premiumUser.id, { status: "ended" });
    await signIn(context, premiumUser);
    const res = await page.request.post(`/api/sessions/${meetingId}/recording`);
    expect(res.status()).toBe(410);
  });
});

test.describe("recording lifecycle", () => {
  test("start → webhook → stop → file appears on the dashboard; meeting keeps running", async ({
    page,
    context,
    premiumUser,
  }) => {
    await signIn(context, premiumUser);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New meeting" }).click();
    await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
    const [session] = await db.sessionsFor(premiumUser.id);
    const roomId: string = session.meeting_id;

    const start = await page.request.post(`/api/sessions/${roomId}/recording`);
    expect(await start.json()).toEqual({ recordingStatus: "starting" });
    expect((await mock.rooms())[roomId].recording).toBe(true);

    // A second start while one is running is a no-op.
    const again = await page.request.post(`/api/sessions/${roomId}/recording`);
    expect(await again.json()).toEqual({ recordingStatus: "starting" });

    await page.request.post(`${APP_URL}/api/webhooks/videosdk`, {
      data: { webhookType: "recording-started", data: { meetingId: roomId } },
    });
    expect((await db.session(roomId)).recording_status).toBe("active");

    const stop = await page.request.delete(`/api/sessions/${roomId}/recording`);
    expect(await stop.json()).toEqual({ recordingStatus: "processing" });
    const rooms = await mock.rooms();
    expect(rooms[roomId]).toEqual({ active: true, recording: false }); // the meeting itself was not ended
    expect((await db.session(roomId)).status).toBe("active");

    await page.goto("/dashboard");
    await expect(page.getByText("Processing…")).toBeVisible();

    // VideoSDK finishes the file and calls us back.
    await mock.post("recordings", { roomId, fileUrl: "https://cdn.example.test/rec.mp4" });
    await page.request.post(`${APP_URL}/api/webhooks/videosdk`, {
      data: { webhookType: "recording-stopped", data: { meetingId: roomId } },
    });
    const done = await db.session(roomId);
    expect(done.recording_status).toBe("completed");
    expect(done.recording_url).toBe("https://cdn.example.test/rec.mp4");

    await page.goto("/dashboard");
    await expect(page.getByRole("paragraph").filter({ hasText: /^Ready$/ })).toBeVisible();
    await page.getByRole("button", { name: "Watch" }).click();
    await expect(page.getByRole("dialog", { name: "Recording player" })).toBeVisible();
    await expect(page.locator("dialog video, [role=dialog] video")).toHaveAttribute("src", "https://cdn.example.test/rec.mp4");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("dashboard picks up a finished file even if the webhook never came", async ({ page, context, premiumUser }) => {
    const meetingId = await db.createSession(premiumUser.id, { recordingStatus: "processing", status: "ended" });
    await mock.post("recordings", { roomId: meetingId, fileUrl: "https://cdn.example.test/late.mp4" });
    const session = { meeting_id: meetingId };

    await signIn(context, premiumUser);
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Watch" })).toBeVisible();
    expect((await db.session(session.meeting_id)).recording_url).toBe("https://cdn.example.test/late.mp4");
  });

  test("forged webhooks can't inject a recording link", async ({ request, premiumUser }) => {
    const meetingId = await db.createSession(premiumUser.id, { recordingStatus: "processing" });
    await request.post("/api/webhooks/videosdk", {
      data: { webhookType: "recording-stopped", data: { meetingId, fileUrl: "https://evil.example/x.mp4", downloadUrl: "https://evil.example/x.mp4" } },
    });
    const row = await db.session(meetingId);
    expect(row.recording_url).toBeNull();
    expect(row.recording_status).toBe("processing");
  });

  test("recording-failed is shown as failed", async ({ page, context, premiumUser }) => {
    const meetingId = await db.createSession(premiumUser.id, { recordingStatus: "active" });
    await page.request.post(`${APP_URL}/api/webhooks/videosdk`, {
      data: { webhookType: "recording-failed", data: { meetingId } },
    });
    expect((await db.session(meetingId)).recording_status).toBe("failed");
    await signIn(context, premiumUser);
    await page.goto("/dashboard");
    await expect(page.getByText("Failed")).toBeVisible();
  });

  test("webhooks for unknown rooms or junk bodies don't error", async ({ request }) => {
    expect((await request.post("/api/webhooks/videosdk", { data: { webhookType: "recording-started", data: { meetingId: "nope" } } })).status()).toBe(200);
    const junk = await fetch(`${APP_URL}/api/webhooks/videosdk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(junk.status).toBe(400);
  });
});

test.describe("session API", () => {
  test("status is public and says who the host is", async ({ request, page, context, user }) => {
    const meetingId = await db.createSession(user.id);
    const anon = await (await request.get(`/api/sessions/${meetingId}/status`)).json();
    expect(anon).toMatchObject({ status: "active", isHost: false, creatorName: "Ada", maxDurationMinutes: 70 });

    await signIn(context, user);
    const host = await (await page.request.get(`/api/sessions/${meetingId}/status`)).json();
    expect(host.isHost).toBe(true);

    expect((await request.get("/api/sessions/nope/status")).status()).toBe(404);
  });

  test("only the host can start the clock, and only once", async ({ request, page, context, user }) => {
    const meetingId = await db.createSession(user.id);
    expect((await request.post(`/api/sessions/${meetingId}/start`)).status()).toBe(403);
    expect((await db.session(meetingId)).started_at).toBeNull();

    await signIn(context, user);
    expect((await page.request.post(`/api/sessions/${meetingId}/start`)).status()).toBe(200);
    const first = (await db.session(meetingId)).started_at;
    expect(first).not.toBeNull();
    await page.request.post(`/api/sessions/${meetingId}/start`);
    expect((await db.session(meetingId)).started_at).toEqual(first);

    const status = await (await page.request.get(`/api/sessions/${meetingId}/status`)).json();
    const minutes = (new Date(status.endsAt).getTime() - new Date(first).getTime()) / 60_000;
    expect(Math.round(minutes)).toBe(70);
  });
});

test.describe("end meeting API (used from inside the call)", () => {
  test("only the host can end the meeting", async ({ request, page, context, user }) => {
    const meetingId = await db.createSession(user.id);
    expect((await request.delete(`/api/sessions/${meetingId}`)).status()).toBe(401);

    const other = await db.createUser();
    await signIn(context, other);
    expect((await page.request.delete(`/api/sessions/${meetingId}`)).status()).toBe(404);
    expect((await db.session(meetingId)).status).toBe("active");

    await context.clearCookies();
    await signIn(context, user);
    expect((await page.request.delete(`/api/sessions/${meetingId}`)).status()).toBe(200);
    expect((await db.session(meetingId)).status).toBe("ended");
  });
});
