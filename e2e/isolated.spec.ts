import { db, expect, mock, test, expectToast } from "./fixtures";

// These change shared mock-server state, so they run in their own project with a single worker.
test.describe.configure({ mode: "serial" });

test("VideoSDK failure shows an error and creates nothing", async ({ authedPage: page, user }) => {
  await page.goto("/dashboard");
  await mock.post("fail-rooms", { count: 1 }); // only the next room creation fails
  await page.getByRole("button", { name: "New meeting" }).click();
  await expectToast(page, "Couldn't create the meeting. Try again in a moment.");
  expect(await db.sessionsFor(user.id)).toHaveLength(0);

  // Retrying works once VideoSDK recovers.
  await page.getByRole("button", { name: "New meeting" }).click();
  await expectToast(page, /Meeting created/);
  expect(await db.sessionsFor(user.id)).toHaveLength(1);
});
