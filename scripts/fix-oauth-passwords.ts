/**
 * One-off: the Flask app gave every Google/GitHub sign-up the password
 * "oauth_user", so anyone could sign in to those accounts with it. This
 * replaces those hashes with a marker that never matches.
 *
 * Usage: npm run db:fix-oauth-passwords   (reads DATABASE_URL)
 */
import { pbkdf2Sync, scryptSync, timingSafeEqual } from "node:crypto";
import postgres from "postgres";

const MARKER = "!oauth-only";

function matches(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [method, salt, hex] = parts;
  const m = method.split(":");
  let digest: Buffer;
  if (m[0] === "pbkdf2") {
    const name = m[1] ?? "sha256";
    digest = pbkdf2Sync(password, salt, Number(m[2] ?? 260000), name === "sha512" ? 64 : 32, name);
  } else if (m[0] === "scrypt") {
    const [N, r, p] = [Number(m[1]), Number(m[2]), Number(m[3])];
    digest = scryptSync(password, salt, 64, { N, r, p, maxmem: 132 * N * r * p });
  } else return false;
  const expected = Buffer.from(hex, "hex");
  return expected.length === digest.length && timingSafeEqual(expected, digest);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql<{ id: number; email: string; password: string }[]>`
      SELECT id, email, password FROM "user" WHERE password <> ${MARKER}`;
    let fixed = 0;
    for (const row of rows) {
      if (matches("oauth_user", row.password)) {
        await sql`UPDATE "user" SET password = ${MARKER} WHERE id = ${row.id}`;
        fixed++;
        console.log(`fixed user ${row.id}`);
      }
    }
    console.log(`checked ${rows.length} users, fixed ${fixed}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
