import { db, expect, formAlert, test, uniqueEmail, werkzeugHash } from "./fixtures";

test.describe("sign up and verify", () => {
  test("shows field errors for an empty form", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByText("Required").first()).toBeVisible();
    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  });

  test("rejects weak passwords", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Password").fill("abcdefgh");
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByText("Include at least one number")).toBeVisible();
  });

  test("full sign-up: code, wrong code, success, lands on dashboard", async ({ page }) => {
    const email = uniqueEmail("signup");
    await page.goto("/");
    await page.getByLabel("First name").fill("Grace");
    await page.getByLabel("Last name").fill("Hopper");
    await page.getByLabel("Email").fill(email.toUpperCase());
    await page.getByLabel("Password").fill("Passw0rd!");
    await page.getByRole("button", { name: "Create free account" }).click();

    await expect(page).toHaveURL(/\/verify\?email=/);
    await expect(page.getByText(email)).toBeVisible(); // stored and shown lowercased

    const row = await db.userByEmail(email);
    expect(row.email).toBe(email);
    expect(row.is_verified).toBe(false);
    expect(row.verification_code).toMatch(/^\d{6}$/);
    expect(row.verification_code_expires).not.toBeNull();

    const wrong = row.verification_code === "000000" ? "111111" : "000000";
    await page.getByLabel("Verification code").fill(wrong);
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(formAlert(page)).toHaveText("Invalid or expired code.");

    await page.getByLabel("Verification code").fill(row.verification_code);
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(page).toHaveURL(/\/dashboard\?welcome=1/);
    await expect(page.getByRole("heading", { name: "Hi, Grace" })).toBeVisible();
    await expect(page.getByText("Your email is verified")).toBeVisible();
  });

  test("dev bypass code is ignored in production", async ({ page }) => {
    const user = await db.createUser({ verified: false });
    await db.sql`UPDATE "user" SET verification_code = '123456', verification_code_expires = now() + interval '10 minutes' WHERE id = ${user.id}`;
    await page.goto(`/verify?email=${encodeURIComponent(user.email)}`);
    await page.getByLabel("Verification code").fill("999000");
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(formAlert(page)).toHaveText("Invalid or expired code.");
    expect((await db.user(user.id)).is_verified).toBe(false);
  });

  test("expired codes are rejected", async ({ page }) => {
    const user = await db.createUser({ verified: false });
    await db.sql`UPDATE "user" SET verification_code = '123456', verification_code_expires = now() - interval '1 minute' WHERE id = ${user.id}`;
    await page.goto(`/verify?email=${encodeURIComponent(user.email)}`);
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(formAlert(page)).toHaveText("That code has expired. Send a new one.");
  });

  test("locks after 5 wrong codes, and resending unlocks", async ({ page }) => {
    const user = await db.createUser({ verified: false });
    await db.sql`UPDATE "user" SET verification_code = '123456', verification_code_expires = now() + interval '10 minutes' WHERE id = ${user.id}`;
    await page.goto(`/verify?email=${encodeURIComponent(user.email)}`);
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Verification code").fill("000000");
      await page.getByRole("button", { name: "Verify email" }).click();
      await expect(formAlert(page)).toBeVisible();
    }
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(formAlert(page)).toHaveText("Too many attempts. Send a new code and try again.");

    await page.getByRole("button", { name: "Send a new code" }).click();
    await expect(page.getByText("a new code is on its way")).toBeVisible();
    const fresh = await db.user(user.id);
    expect(fresh.code_attempts).toBe(0);
    await page.getByLabel("Verification code").fill(fresh.verification_code);
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("can't register an email that already has a verified account", async ({ page, user }) => {
    await page.goto("/");
    await page.getByLabel("First name").fill("X");
    await page.getByLabel("Last name").fill("Y");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("Passw0rd!");
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByText("An account with this email already exists")).toBeVisible();
  });
});

test.describe("sign in", () => {
  async function signInForm(page: import("@playwright/test").Page, email: string, password: string) {
    await page.goto("/?signin=1");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.locator("form button[type=submit]").click();
  }

  test("works with any email casing and goes to the dashboard", async ({ page, user }) => {
    await signInForm(page, user.email.toUpperCase(), user.password);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("same error for wrong password and unknown email", async ({ page, user }) => {
    await signInForm(page, user.email, "wrong-password1");
    await expect(formAlert(page)).toHaveText("Incorrect email or password.");
    await signInForm(page, uniqueEmail("nobody"), "whatever1");
    await expect(formAlert(page)).toHaveText("Incorrect email or password.");
  });

  test("the old app's oauth_user placeholder password never works", async ({ page }) => {
    const user = await db.createUser({ rawPasswordHash: werkzeugHash("oauth_user") });
    await signInForm(page, user.email, "oauth_user");
    await expect(formAlert(page)).toHaveText("Incorrect email or password.");
  });

  test("accepts password hashes created by the Flask app", async ({ page }) => {
    // Generated with Werkzeug 2.0.3 for the password "hunter2".
    const flaskHash =
      "pbkdf2:sha256:260000$fbGZvKUtAmxR6IDM$175317115c68c234ee84fd5cb18d6e6de900f0676f38002cefeac13614c2a06b";
    const user = await db.createUser({ rawPasswordHash: flaskHash });
    await signInForm(page, user.email, "hunter2");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("unverified users are sent to verify with a new code", async ({ page }) => {
    const user = await db.createUser({ verified: false });
    await signInForm(page, user.email, user.password);
    await expect(page).toHaveURL(/\/verify\?email=/);
    expect((await db.user(user.id)).verification_code).toMatch(/^\d{6}$/);
  });

  test("returns to ?next after sign-in, but not to other sites", async ({ page, user }) => {
    await page.goto("/?signin=1&next=/forgot-password");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.context().clearCookies();
    await page.goto("/?signin=1&next=//evil.example");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
  });

  test("sign out clears the session", async ({ authedPage: page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/\?signin=1/);
  });

  test("signed-in users skip the landing page", async ({ authedPage: page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("a tampered session cookie is ignored", async ({ page, context }) => {
    await context.addCookies([{ name: "gm_session", value: "not.a.jwt", url: "http://localhost:3100" }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/\?signin=1/);
  });
});

test.describe("Google and GitHub sign-in", () => {
  for (const provider of ["google", "github"] as const) {
    test(`${provider}: redirects to the provider with state and our callback`, async ({ request }) => {
      const res = await request.get(`/api/auth/${provider}?next=/dashboard`, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      const location = new URL(res.headers()["location"]);
      expect(location.host).toBe(provider === "google" ? "accounts.google.com" : "github.com");
      expect(location.searchParams.get("state")).toMatch(/^[a-f0-9]{48}$/);
      expect(location.searchParams.get("redirect_uri")).toBe(`http://localhost:3100/api/auth/${provider}/callback`);
      expect(res.headers()["set-cookie"]).toContain("gm_oauth_state=");
    });

    test(`${provider}: callback with a forged state is rejected`, async ({ page }) => {
      await page.goto(`/api/auth/${provider}/callback?code=abc&state=forged`);
      await expect(page).toHaveURL(/auth_error=invalid_state/);
      await expect(page.getByText("That sign-in link expired")).toBeVisible();
    });
  }

  test("provider cancel shows a friendly message", async ({ page }) => {
    await page.goto("/api/auth/google/callback?error=access_denied");
    await expect(page.getByText("Sign-in was cancelled.")).toBeVisible();
  });

  test("unknown provider is rejected", async ({ page }) => {
    await page.goto("/api/auth/facebook");
    await expect(page).toHaveURL(/auth_error=provider_unavailable/);
  });

  test("both buttons are shown on the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveAttribute("href", "/api/auth/google");
    await expect(page.getByRole("link", { name: "Continue with GitHub" })).toHaveAttribute("href", "/api/auth/github");
  });
});
