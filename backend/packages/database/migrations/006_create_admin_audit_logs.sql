CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
  ON admin_audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx
  ON admin_audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx
  ON admin_audit_logs (action, created_at DESC);
