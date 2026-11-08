import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Table and column names match the existing Flask/SQLAlchemy database. */
export const users = pgTable("user", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 30 }).notNull(),
  lastName: varchar("last_name", { length: 30 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().unique(),
  password: varchar("password", { length: 256 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastActive: timestamp("last_active", { withTimezone: true }),
  dateJoined: timestamp("date_joined", { withTimezone: true }).defaultNow(),
  aboutMe: varchar("about_me", { length: 2500 }),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationCode: varchar("verification_code", { length: 6 }),
  verificationCodeExpires: timestamp("verification_code_expires", { withTimezone: true }),
  codeAttempts: integer("code_attempts").notNull().default(0),
  passwordResetHash: varchar("password_reset_hash", { length: 128 }),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  subscriptionId: varchar("subscription_id", { length: 255 }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
});

export const userImages = pgTable("user_image", {
  id: serial("id").primaryKey(),
  publicId: varchar("public_id", { length: 500 }).notNull().unique(),
  imageUrl: varchar("image_url", { length: 500 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
});

export const videoSessions = pgTable("video_session", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id")
    .notNull()
    .references(() => users.id),
  meetingId: varchar("meeting_id", { length: 255 }).notNull().unique(),
  sessionUrl: varchar("session_url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  maxDurationMinutes: integer("max_duration_minutes").default(70),
  startedAt: timestamp("started_at", { withTimezone: true }),
  status: varchar("status", { length: 20 }).default("active"),
  meetingToken: text("meeting_token"),
  recordingUrl: varchar("recording_url", { length: 500 }),
  recordingId: varchar("recording_id", { length: 255 }),
  recordingStatus: varchar("recording_status", { length: 50 }).default("none"),
});

export const stripeEvents = pgTable("stripe_event", {
  id: varchar("id", { length: 255 }).primaryKey(),
  type: varchar("type", { length: 100 }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type VideoSession = typeof videoSessions.$inferSelect;
