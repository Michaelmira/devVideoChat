/**
 * Applies SQL files in db/migrations in order, once each.
 * Usage: npm run db:migrate   (reads DATABASE_URL)
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied = new Set(
      (await sql<{ name: string }[]>`SELECT name FROM app_migrations`).map((r) => r.name),
    );
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = await readFile(path.join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO app_migrations (name) VALUES (${file})`;
      });
      console.log(`applied ${file}`);
    }
    console.log("migrations up to date");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
