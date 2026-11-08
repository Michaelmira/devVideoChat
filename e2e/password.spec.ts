import { db, expect, formAlert, signIn, test, expectToast, uniqueEmail } from "./fixtures";
import { createHash } from "node:crypto";

test.describe("forgot and reset password", () => {
  test("same message whether or not the account exists", async ({ page, user }) => {
    for (const email of [user.email, uniqueEmail("ghost")]) {
      await page.goto("/forgot-password");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByText("If an account exists for that email, we've sent a reset link.")).toBeVisible();
    }
    const row = await db.user(user.id);
    expect(row.password_reset_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  async function seedResetToken(userId: number, expiresInMinutes = 60) {
    const token = "a".repeat(32) + Math.random().toString(16).slice(2).padEnd(32, "0").slice(0, 32);
    const hash = createHash("sha256").update(token).digest("hex");
    await db.sql`UPDATE "user" SET password_reset_hash = ${hash},
      password_reset_expires = now() + make_interval(mins => ${expiresInMinutes}) WHERE id = ${userId}`;
    return token;
  }

  test("reset works once, then the link is dead", async ({ page, user }) => {
    const token = await seedResetToken(user.id);
    const url = `/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await page.goto(url);
    await page.getByLabel("New password").fill("NewPassw0rd");
    await page.getByLabel("Confirm password").fill("NewPassw0rd");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/\/\?signin=1&reset=1/);
    await expect(page.getByText("Password updated. Sign in with your new password.")).toBeVisible();

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("NewPassw0rd");
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.context().clearCookies();
    await page.goto(url);
    await page.getByLabel("New password").fill("Another1pw");
    await page.getByLabel("Confirm password").fill("Another1pw");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(formAlert(page)).toHaveText("This reset link is invalid or has expired.");
  });

  test("expired reset links are rejected", async ({ page, user }) => {
    const token = await seedResetToken(user.id, -1);
    await page.goto(`/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`);
    await page.getByLabel("New password").fill("NewPassw0rd");
    await page.getByLabel("Confirm password").fill("NewPassw0rd");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(formAlert(page)).toHaveText("This reset link is invalid or has expired.");
  });

  test("mismatched confirmation is caught", async ({ page, user }) => {
    const token = await seedResetToken(user.id);
    await page.goto(`/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`);
    await page.getByLabel("New password").fill("NewPassw0rd");
    await page.getByLabel("Confirm password").fill("Different1");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test("a link missing its token explains what to do", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Invalid reset link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new reset link" })).toBeVisible();
  });
});

test.describe("change password from the dashboard", () => {
  test("requires the current password", async ({ authedPage: page, user }) => {
    await page.goto("/dashboard");
    await page.getByLabel("Current password").fill("wrong-one1");
    await page.getByLabel("New password").fill("Changed1pw");
    await page.getByLabel("Confirm").fill("Changed1pw");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Current password is incorrect")).toBeVisible();

    await page.getByLabel("Current password").fill(user.password);
    await page.getByLabel("New password").fill("Changed1pw");
    await page.getByLabel("Confirm").fill("Changed1pw");
    await page.getByRole("button", { name: "Update password" }).click();
    await expectToast(page, "Password updated.");
  });

  test("OAuth-only users can set a password without a current one", async ({ page, context }) => {
    const user = await db.createUser({ rawPasswordHash: "!oauth-only" });
    await signIn(context, user);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Set a password" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveCount(0);
    await page.getByLabel("New password").fill("FirstPw123");
    await page.getByLabel("Confirm").fill("FirstPw123");
    await page.getByRole("button", { name: "Set password" }).click();
    await expectToast(page, "Password set");
  });
});

test("profile edits are saved", async ({ authedPage: page, user }) => {
  await page.goto("/dashboard");
  await page.getByLabel("First name").fill("Augusta");
  await page.getByLabel("Phone").fill("+1 555 0100");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expectToast(page, "Profile saved.");
  const row = await db.user(user.id);
  expect(row.first_name).toBe("Augusta");
  expect(row.phone).toBe("+1 555 0100");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hi, Augusta" })).toBeVisible();
});
