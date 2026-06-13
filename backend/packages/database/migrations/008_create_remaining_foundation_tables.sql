CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS storage_type varchar(80),
  ADD COLUMN IF NOT EXISTS side_effect_warning text,
  ADD COLUMN IF NOT EXISTS interaction_warning text,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE TABLE IF NOT EXISTS medicine_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  synonym varchar(180) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS medicine_synonyms_unique_idx
  ON medicine_synonyms (medicine_id, lower(synonym));

CREATE INDEX IF NOT EXISTS medicine_synonyms_synonym_idx
  ON medicine_synonyms (synonym);

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type varchar(40) NOT NULL DEFAULT 'image',
  ocr_text text,
  extracted_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_status varchar(60) NOT NULL DEFAULT 'UPLOADED',
  confidence_score numeric(5, 2),
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason text,
  fraud_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prescriptions_file_type_check CHECK (
    file_type IN ('image', 'pdf')
  ),
  CONSTRAINT prescriptions_status_check CHECK (
    verification_status IN (
      'UPLOADED',
      'OCR_PENDING',
      'OCR_COMPLETED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'FLAGGED'
    )
  ),
  CONSTRAINT prescriptions_confidence_check CHECK (
    confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS prescriptions_customer_idx
  ON prescriptions (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prescriptions_status_idx
  ON prescriptions (verification_status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider varchar(80) NOT NULL,
  provider_reference varchar(160),
  payment_method varchar(60) NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency varchar(8) NOT NULL DEFAULT 'INR',
  status varchar(60) NOT NULL DEFAULT 'PAYMENT_INITIATED',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_transactions_amount_check CHECK (amount >= 0),
  CONSTRAINT payment_transactions_status_check CHECK (
    status IN (
      'PAYMENT_INITIATED',
      'PAYMENT_AUTHORIZED',
      'PAYMENT_CAPTURED',
      'PAYMENT_FAILED',
      'REFUND_INITIATED',
      'REFUND_PROCESSED'
    )
  )
);

CREATE INDEX IF NOT EXISTS payment_transactions_order_idx
  ON payment_transactions (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id uuid NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  status varchar(60) NOT NULL DEFAULT 'REFUND_INITIATED',
  reason text,
  provider_reference varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT refunds_amount_check CHECK (amount >= 0),
  CONSTRAINT refunds_status_check CHECK (
    status IN ('REFUND_INITIATED', 'REFUND_PROCESSED', 'REFUND_FAILED')
  )
);

CREATE INDEX IF NOT EXISTS refunds_order_idx
  ON refunds (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE SET NULL,
  status varchar(60) NOT NULL DEFAULT 'ASSIGNED',
  pickup_otp varchar(12),
  delivery_otp varchar(12),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT delivery_assignments_status_check CHECK (
    status IN (
      'ASSIGNED',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED',
      'CANCELLED'
    )
  )
);

CREATE INDEX IF NOT EXISTS delivery_assignments_order_idx
  ON delivery_assignments (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_assignments_rider_idx
  ON delivery_assignments (rider_user_id, status);

CREATE TABLE IF NOT EXISTS delivery_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES delivery_assignments(id) ON DELETE CASCADE,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status varchar(60),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT delivery_tracking_latitude_check CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT delivery_tracking_longitude_check CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  )
);

CREATE INDEX IF NOT EXISTS delivery_tracking_assignment_idx
  ON delivery_tracking_events (assignment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS proof_of_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES delivery_assignments(id) ON DELETE CASCADE,
  recipient_name varchar(120) NOT NULL,
  otp_verified boolean NOT NULL DEFAULT false,
  signature_url text,
  photo_url text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  channel varchar(40) NOT NULL,
  template_key varchar(120) NOT NULL,
  title varchar(180),
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(40) NOT NULL DEFAULT 'QUEUED',
  scheduled_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_channel_check CHECK (
    channel IN ('push', 'sms', 'email', 'websocket')
  ),
  CONSTRAINT notifications_status_check CHECK (
    status IN ('QUEUED', 'SENT', 'FAILED', 'CANCELLED')
  )
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_status_idx
  ON notifications (status, scheduled_at, created_at);
