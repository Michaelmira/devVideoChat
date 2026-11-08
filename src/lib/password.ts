import "server-only";
import { pbkdf2, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

/**
 * Password hashing compatible with Werkzeug (the Flask app's
 * generate_password_hash / check_password_hash), so existing users keep
 * their passwords and both apps can run against the same database.
 *
 * Format: "<method>$<salt>$<hex digest>"
 *   pbkdf2:sha256:<iterations>
 *   scrypt:<N>:<r>:<p>
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Stored for accounts that only sign in with Google/GitHub. Never matches. */
export const OAUTH_ONLY_PASSWORD = "!oauth-only";

function genSalt(length = 16): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += SALT_CHARS[bytes[i] % SALT_CHARS.length];
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = genSalt();
  const digest = await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, 32, "sha256");
  return `pbkdf2:sha256:${PBKDF2_ITERATIONS}$${salt}$${digest.toString("hex")}`;
}

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  opts: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function computeDigest(method: string, salt: string, password: string): Promise<Buffer | null> {
  const parts = method.split(":");
  if (parts[0] === "pbkdf2") {
    const hashName = parts[1] ?? "sha256";
    const iterations = Number(parts[2] ?? 260_000);
    if (!["sha256", "sha512", "sha1"].includes(hashName) || !Number.isFinite(iterations)) return null;
    const keylen = hashName === "sha512" ? 64 : hashName === "sha1" ? 20 : 32;
    return pbkdf2Async(password, salt, iterations, keylen, hashName);
  }
  if (parts[0] === "scrypt") {
    const N = Number(parts[1] ?? 32768);
    const r = Number(parts[2] ?? 8);
    const p = Number(parts[3] ?? 1);
    if (![N, r, p].every(Number.isFinite)) return null;
    return scryptAsync(password, salt, 64, { N, r, p, maxmem: 132 * N * r * p });
  }
  return null;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || stored.split("$").length !== 3) return false;
  const [method, salt, hex] = stored.split("$");
  const digest = await computeDigest(method, salt, password);
  if (!digest) return false;
  const expected = Buffer.from(hex, "hex");
  return expected.length === digest.length && timingSafeEqual(expected, digest);
}
