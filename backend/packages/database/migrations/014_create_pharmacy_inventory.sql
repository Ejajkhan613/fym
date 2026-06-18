CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name varchar(180) NOT NULL,
  generic_name varchar(180),
  strength varchar(80),
  quantity integer NOT NULL DEFAULT 0,
  batch_number varchar(120),
  expiry_date date,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  cold_chain_required boolean NOT NULL DEFAULT false,
  fast_moving boolean NOT NULL DEFAULT false,
  source varchar(40) NOT NULL DEFAULT 'manual',
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  stock_confidence_score numeric(5, 2) NOT NULL DEFAULT 50.00,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pharmacy_inventory_quantity_check CHECK (quantity >= 0),
  CONSTRAINT pharmacy_inventory_price_check CHECK (price >= 0),
  CONSTRAINT pharmacy_inventory_confidence_check CHECK (
    stock_confidence_score BETWEEN 0 AND 100
  ),
  CONSTRAINT pharmacy_inventory_source_check CHECK (
    source IN ('manual', 'bulk_upload', 'pos_sync', 'system_adjustment')
  )
);

CREATE INDEX IF NOT EXISTS pharmacy_inventory_pharmacy_idx
  ON pharmacy_inventory (pharmacy_id, last_updated_at DESC);

CREATE INDEX IF NOT EXISTS pharmacy_inventory_low_stock_idx
  ON pharmacy_inventory (pharmacy_id, quantity)
  WHERE quantity <= 10;

CREATE INDEX IF NOT EXISTS pharmacy_inventory_expiry_idx
  ON pharmacy_inventory (pharmacy_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS pharmacy_inventory_name_idx
  ON pharmacy_inventory (pharmacy_id, lower(medicine_name));

CREATE TABLE IF NOT EXISTS pharmacy_stock_mismatch_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES pharmacy_inventory(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  medicine_name varchar(180) NOT NULL,
  expected_quantity integer,
  actual_quantity integer,
  reason varchar(80) NOT NULL,
  notes text,
  status varchar(40) NOT NULL DEFAULT 'OPEN',
  reported_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,

  CONSTRAINT stock_mismatch_expected_check CHECK (
    expected_quantity IS NULL OR expected_quantity >= 0
  ),
  CONSTRAINT stock_mismatch_actual_check CHECK (
    actual_quantity IS NULL OR actual_quantity >= 0
  ),
  CONSTRAINT stock_mismatch_reason_check CHECK (
    reason IN (
      'shelf_count_mismatch',
      'expired_batch_found',
      'damaged_stock',
      'billing_sync_issue',
      'order_acceptance_mismatch',
      'other'
    )
  ),
  CONSTRAINT stock_mismatch_status_check CHECK (
    status IN ('OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED')
  )
);

CREATE INDEX IF NOT EXISTS pharmacy_stock_mismatch_pharmacy_idx
  ON pharmacy_stock_mismatch_reports (pharmacy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pharmacy_stock_mismatch_inventory_idx
  ON pharmacy_stock_mismatch_reports (inventory_id, created_at DESC);
