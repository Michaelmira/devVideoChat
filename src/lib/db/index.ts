import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __db?: Db };

function create(): Db {
  // Railway and Heroku style URLs may use postgres:// — postgres-js accepts both.
  const client = postgres(env().DATABASE_URL, { max: 10, prepare: false });
  return drizzle(client, { schema });
}

/** Lazily created, reused across hot reloads in development. */
export function db(): Db {
  if (!globalForDb.__db) globalForDb.__db = create();
  return globalForDb.__db;
}

export * from "./schema";
