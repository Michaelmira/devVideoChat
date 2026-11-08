import { db, expect, signIn, test } from "./fixtures";

// Runs in the "mobile" project (Pixel 7).
async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("public pages fit a phone screen", async ({ page, user }) => {
  const meetingId = await db.createSession(user.id);
  for (const path of ["/", "/?signin=1", "/forgot-password", `/verify?email=a%40b.c`, `/join/${meetingId}`, "/join/nope"]) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
  }
});

test("dashboard fits a phone screen with a meeting", async ({ page, context, user }) => {
  await db.createSession(user.id);
  await signIn(context, user);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Join as host" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("meeting lobby controls are reachable on a phone", async ({ page, user }) => {
  const meetingId = await db.createSession(user.id);
  await page.goto(`/meeting/${meetingId}?name=Phone`);
  await expect(page.getByRole("button", { name: "Join now" })).toBeInViewport();
  await expectNoHorizontalScroll(page);
});

test("sign up works on a phone", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("First name").fill("Mo");
  await page.getByLabel("Last name").fill("Bile");
  await page.getByLabel("Email").fill(`mobile.${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Create free account" }).click();
  await expect(page).toHaveURL(/\/verify/);
});
