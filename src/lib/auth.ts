import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, users, type User } from "@/lib/db";
import { readSessionUserId } from "@/lib/session";

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const id = await readSessionUserId();
  if (!id) return null;
  const [user] = await db().select().from(users).where(eq(users.id, id)).limit(1);
  if (!user || user.isActive === false || !user.isVerified) return null;
  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/?signin=1");
  return user;
}

export function isPremium(user: Pick<User, "subscriptionStatus">): boolean {
  return user.subscriptionStatus === "premium";
}

/** Shape sent to client components. Never includes secrets. */
export function publicUser(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    subscriptionStatus: isPremium(user) ? ("premium" as const) : ("free" as const),
    currentPeriodEnd: user.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    hasPassword: user.password.split("$").length === 3,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
