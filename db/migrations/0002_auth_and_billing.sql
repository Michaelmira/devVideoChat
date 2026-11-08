-- Additive only: the Flask app keeps working against these tables.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMPTZ;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_reset_hash VARCHAR(128);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS ix_user_stripe_customer_id ON "user" (stripe_customer_id);
CREATE INDEX IF NOT EXISTS ix_video_session_creator_status ON video_session (creator_id, status);

-- Processed Stripe webhook events, so retries are not applied twice.
CREATE TABLE IF NOT EXISTS stripe_event (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
