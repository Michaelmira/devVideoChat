-- Baseline: the schema the Flask app created (Alembic revision cae0ded8bb40).
-- Idempotent so it is a no-op against the existing production database.
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(30) NOT NULL,
  last_name VARCHAR(30) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password VARCHAR(256) NOT NULL,
  is_active BOOLEAN,
  last_active TIMESTAMPTZ,
  date_joined TIMESTAMPTZ,
  about_me VARCHAR(2500),
  is_verified BOOLEAN NOT NULL,
  verification_code VARCHAR(6),
  subscription_status VARCHAR(50),
  stripe_customer_id VARCHAR(255),
  subscription_id VARCHAR(255),
  current_period_end TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON "user" (email);
CREATE INDEX IF NOT EXISTS ix_user_phone ON "user" (phone);

CREATE TABLE IF NOT EXISTS user_image (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(500) NOT NULL UNIQUE,
  image_url VARCHAR(500) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS video_session (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES "user"(id),
  meeting_id VARCHAR(255) NOT NULL UNIQUE,
  session_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  max_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  status VARCHAR(20),
  meeting_token TEXT,
  recording_url VARCHAR(500),
  recording_id VARCHAR(255),
  recording_status VARCHAR(50)
);
