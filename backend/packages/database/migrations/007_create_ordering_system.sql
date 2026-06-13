CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name varchar(180) NOT NULL,
  generic_name varchar(180),
  salt_composition text,
  strength varchar(80),
  dosage_form varchar(80),
  manufacturer varchar(160),
  pack_size varchar(80),
  mrp numeric(12, 2) NOT NULL DEFAULT 0,
  schedule_category varchar(40),
  requires_prescription boolean NOT NULL DEFAULT false,
  is_restricted boolean NOT NULL DEFAULT false,
  cold_chain_required boolean NOT NULL DEFAULT false,
  substitution_allowed boolean NOT NULL DEFAULT true,
  therapeutic_class varchar(120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medicines_brand_name_idx
  ON medicines (brand_name);

CREATE INDEX IF NOT EXISTS medicines_generic_name_idx
  ON medicines (generic_name);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE SET NULL,
  status varchar(60) NOT NULL DEFAULT 'CREATED',
  order_type varchar(40) NOT NULL DEFAULT 'OTC',
  payment_status varchar(60) NOT NULL DEFAULT 'PAYMENT_PENDING',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12, 2) NOT NULL DEFAULT 0,
  platform_fee numeric(12, 2) NOT NULL DEFAULT 0,
  discount numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  delivery_address jsonb NOT NULL,
  prescription_id uuid,
  accepted_at timestamptz,
  packed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orders_status_check CHECK (
    status IN (
      'CREATED',
      'PAYMENT_PENDING',
      'PRESCRIPTION_UPLOADED',
      'PRESCRIPTION_UNDER_REVIEW',
      'PRESCRIPTION_REJECTED',
      'VENDOR_MATCHING',
      'VENDOR_OFFERED',
      'VENDOR_ACCEPTED',
      'PHARMACIST_APPROVED',
      'PACKING',
      'PACKED',
      'RIDER_ASSIGNED',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED_BY_USER',
      'CANCELLED_BY_VENDOR',
      'CANCELLED_BY_ADMIN',
      'FAILED_DELIVERY',
      'REFUNDED',
      'DISPUTED'
    )
  ),
  CONSTRAINT orders_type_check CHECK (
    order_type IN ('OTC', 'PRESCRIPTION', 'MIXED')
  ),
  CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN (
      'PAYMENT_PENDING',
      'PAYMENT_INITIATED',
      'PAYMENT_AUTHORIZED',
      'PAYMENT_CAPTURED',
      'PAYMENT_FAILED',
      'REFUND_INITIATED',
      'REFUND_PROCESSED'
    )
  )
);

CREATE INDEX IF NOT EXISTS orders_customer_idx
  ON orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_pharmacy_idx
  ON orders (pharmacy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_idx
  ON orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id) ON DELETE SET NULL,
  requested_name varchar(180) NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  line_total numeric(12, 2) NOT NULL DEFAULT 0,
  substitution_of_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  requires_prescription boolean NOT NULL DEFAULT false,
  status varchar(40) NOT NULL DEFAULT 'REQUESTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_status_check CHECK (
    status IN (
      'REQUESTED',
      'CONFIRMED',
      'SUBSTITUTION_REQUESTED',
      'SUBSTITUTED',
      'UNAVAILABLE',
      'CANCELLED'
    )
  )
);

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON order_items (order_id);

CREATE TABLE IF NOT EXISTS vendor_order_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  status varchar(80) NOT NULL DEFAULT 'OFFER_SENT',
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz NOT NULL,
  rejection_reason text,
  stock_confirmed boolean NOT NULL DEFAULT false,
  expiry_confirmed boolean NOT NULL DEFAULT false,
  pharmacist_verified boolean NOT NULL DEFAULT false,
  packing_time_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vendor_order_offers_status_check CHECK (
    status IN (
      'OFFER_SENT',
      'OFFER_VIEWED',
      'OFFER_ACCEPTED',
      'OFFER_REJECTED',
      'OFFER_EXPIRED',
      'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE'
    )
  ),
  CONSTRAINT vendor_order_offers_packing_time_check CHECK (
    packing_time_minutes IS NULL OR packing_time_minutes BETWEEN 1 AND 180
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_order_offers_order_pharmacy_unique_idx
  ON vendor_order_offers (order_id, pharmacy_id);

CREATE INDEX IF NOT EXISTS vendor_order_offers_pharmacy_status_idx
  ON vendor_order_offers (pharmacy_id, status, sent_at DESC);

CREATE INDEX IF NOT EXISTS vendor_order_offers_order_idx
  ON vendor_order_offers (order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status varchar(60),
  to_status varchar(60) NOT NULL,
  actor_type varchar(40),
  actor_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx
  ON order_status_history (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS realtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type varchar(80) NOT NULL,
  aggregate_id uuid NOT NULL,
  event_name varchar(120) NOT NULL,
  channel varchar(160) NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS realtime_events_unpublished_idx
  ON realtime_events (created_at)
  WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS realtime_events_aggregate_idx
  ON realtime_events (aggregate_type, aggregate_id, created_at DESC);
