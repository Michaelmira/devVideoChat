import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, users, type User } from "@/lib/db";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Case-insensitive lookup (the Flask app stored emails as typed). */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, normalizeEmail(email)))
    .limit(1);
  return user;
}
