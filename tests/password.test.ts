import { describe, expect, it } from "vitest";
import { OAUTH_ONLY_PASSWORD, hashPassword, verifyPassword } from "@/lib/password";

// Generated with Werkzeug 2.0.3 (the Flask app's version) and Werkzeug 3.x.
const WERKZEUG_2_PBKDF2 =
  "pbkdf2:sha256:260000$fbGZvKUtAmxR6IDM$175317115c68c234ee84fd5cb18d6e6de900f0676f38002cefeac13614c2a06b";
const WERKZEUG_3_SCRYPT =
  "scrypt:32768:8:1$MkHLTBGYLZdh5Vdv$4fd0263beae1f39a2537bbea220c63b325b565d4d3b20f0f08eb6321a34412a11ed9849f868d1995212020615ed2d6989227d4b2a7e2423dd41e8d1a26a0f345";

describe("werkzeug-compatible passwords", () => {
  it("verifies hashes created by the Flask app", async () => {
    expect(await verifyPassword("hunter2", WERKZEUG_2_PBKDF2)).toBe(true);
    expect(await verifyPassword("wrong", WERKZEUG_2_PBKDF2)).toBe(false);
    expect(await verifyPassword("hunter2", WERKZEUG_3_SCRYPT)).toBe(true);
    expect(await verifyPassword("wrong", WERKZEUG_3_SCRYPT)).toBe(false);
  });

  it("round-trips new hashes", async () => {
    const h = await hashPassword("s3cret!");
    expect(h.startsWith("pbkdf2:sha256:600000$")).toBe(true);
    expect(await verifyPassword("s3cret!", h)).toBe(true);
    expect(await verifyPassword("s3cret", h)).toBe(false);
  });

  it("never matches the OAuth-only marker or malformed values", async () => {
    expect(await verifyPassword("!oauth-only", OAUTH_ONLY_PASSWORD)).toBe(false);
    expect(await verifyPassword("", "")).toBe(false);
    expect(await verifyPassword("x", "md5$a$b")).toBe(false);
  });
});
