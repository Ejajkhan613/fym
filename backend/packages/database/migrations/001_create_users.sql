CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  phone varchar(20) NOT NULL,
  role varchar(40) NOT NULL DEFAULT 'customer',
  status varchar(40) NOT NULL DEFAULT 'pending_verification',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_phone_required CHECK (phone IS NOT NULL),
  CONSTRAINT users_role_check CHECK (
    role IN (
      'customer',
      'pharmacy_owner',
      'pharmacist',
      'delivery_partner',
      'admin',
      'support_agent'
    )
  ),
  CONSTRAINT users_status_check CHECK (
    status IN (
      'pending_verification',
      'active',
      'suspended',
      'blocked',
      'deleted'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
  ON users (phone);

CREATE INDEX IF NOT EXISTS users_role_status_idx
  ON users (role, status);

CREATE INDEX IF NOT EXISTS users_created_at_idx
  ON users (created_at DESC);
