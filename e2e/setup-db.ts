/**
 * Recreates the test database and applies migrations. Runs before the app
 * starts (see playwright.config.ts), so every run starts from an empty schema.
 */
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "./env";

async function main() {
  const target = new URL(TEST_DATABASE_URL);
  const dbName = target.pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName}": the test database name must contain "test".`);
  }
  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = "/postgres";
  const sql = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await sql.unsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await sql.end();
  }
  execFileSync("npx", ["tsx", "scripts/migrate.ts"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
