CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth date,
  gender varchar(40),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_profiles_gender_check CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')
  )
);

CREATE INDEX IF NOT EXISTS customer_profiles_user_idx
  ON customer_profiles (user_id);

CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label varchar(80),
  recipient_name varchar(120),
  phone varchar(20),
  address_line1 text NOT NULL,
  address_line2 text,
  city varchar(80) NOT NULL,
  state varchar(80) NOT NULL,
  pincode varchar(12) NOT NULL,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_default boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_addresses_latitude_check CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT user_addresses_longitude_check CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  )
);

CREATE INDEX IF NOT EXISTS user_addresses_user_idx
  ON user_addresses (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_idx
  ON user_addresses (user_id)
  WHERE is_default = true;

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id) ON DELETE SET NULL,
  requested_name varchar(180) NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  requires_prescription boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cart_items_quantity_check CHECK (quantity BETWEEN 1 AND 100),
  CONSTRAINT cart_items_unit_price_check CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS cart_items_customer_idx
  ON cart_items (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category varchar(80) NOT NULL,
  priority varchar(40) NOT NULL DEFAULT 'medium',
  status varchar(40) NOT NULL DEFAULT 'open',
  subject varchar(180) NOT NULL,
  description text NOT NULL,
  resolution text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,

  CONSTRAINT support_tickets_priority_check CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  CONSTRAINT support_tickets_status_check CHECK (
    status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')
  )
);

CREATE INDEX IF NOT EXISTS support_tickets_customer_idx
  ON support_tickets (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON support_tickets (status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_type varchar(40) NOT NULL,
  message text NOT NULL,
  attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT support_messages_sender_type_check CHECK (
    sender_type IN ('customer', 'support_agent', 'admin', 'pharmacy', 'system')
  )
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
  ON support_messages (ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  penalty_type varchar(80) NOT NULL,
  level integer NOT NULL DEFAULT 1,
  base_amount numeric(12, 2) NOT NULL DEFAULT 0,
  customer_inconvenience_fee numeric(12, 2) NOT NULL DEFAULT 0,
  delivery_loss_fee numeric(12, 2) NOT NULL DEFAULT 0,
  platform_sla_fee numeric(12, 2) NOT NULL DEFAULT 0,
  repeat_multiplier numeric(5, 2) NOT NULL DEFAULT 1,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'applied',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT penalties_level_check CHECK (level BETWEEN 1 AND 5),
  CONSTRAINT penalties_amounts_check CHECK (
    base_amount >= 0
    AND customer_inconvenience_fee >= 0
    AND delivery_loss_fee >= 0
    AND platform_sla_fee >= 0
    AND repeat_multiplier >= 1
    AND amount >= 0
  ),
  CONSTRAINT penalties_status_check CHECK (
    status IN ('applied', 'waived', 'paid', 'disputed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS penalties_pharmacy_idx
  ON penalties (pharmacy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS penalties_status_idx
  ON penalties (status, created_at DESC);

CREATE TABLE IF NOT EXISTS penalty_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_id uuid NOT NULL REFERENCES penalties(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  status varchar(40) NOT NULL DEFAULT 'submitted',
  reason text NOT NULL,
  evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT penalty_appeals_status_check CHECK (
    status IN ('submitted', 'under_review', 'approved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS penalty_appeals_penalty_idx
  ON penalty_appeals (penalty_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prescription_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_type varchar(40) NOT NULL,
  access_reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prescription_access_actor_type_check CHECK (
    actor_type IN ('customer', 'pharmacy', 'pharmacist', 'admin', 'support_agent', 'auditor')
  )
);

CREATE INDEX IF NOT EXISTS prescription_access_logs_prescription_idx
  ON prescription_access_logs (prescription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prescription_access_logs_actor_idx
  ON prescription_access_logs (actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS regulatory_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type varchar(80) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'draft',
  period_start date,
  period_end date,
  generated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  file_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT regulatory_reports_status_check CHECK (
    status IN ('draft', 'generated', 'submitted', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS regulatory_reports_type_idx
  ON regulatory_reports (report_type, created_at DESC);
