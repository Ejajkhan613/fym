CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash varchar(128) NOT NULL UNIQUE,
  user_agent text,
  ip_address text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_refresh_sessions_user_active_idx
  ON auth_refresh_sessions (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(20) NOT NULL,
  purpose varchar(40) NOT NULL,
  otp_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  request_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auth_otp_challenges_purpose_check CHECK (
    purpose IN ('login', 'register')
  ),
  CONSTRAINT auth_otp_challenges_attempts_check CHECK (attempts >= 0),
  CONSTRAINT auth_otp_challenges_max_attempts_check CHECK (max_attempts > 0)
);

CREATE INDEX IF NOT EXISTS auth_otp_challenges_phone_purpose_idx
  ON auth_otp_challenges (phone, purpose, created_at DESC);
