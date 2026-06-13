CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  legal_name varchar(200),
  license_number varchar(80) NOT NULL,
  license_valid_from date,
  license_valid_to date,
  gst_number varchar(32),
  shop_registration_number varchar(80),
  address_line1 text NOT NULL,
  address_line2 text,
  city varchar(80) NOT NULL,
  state varchar(80) NOT NULL,
  pincode varchar(12) NOT NULL,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status varchar(40) NOT NULL DEFAULT 'DRAFT',
  trust_score numeric(5, 2) NOT NULL DEFAULT 50.00,
  service_radius_km numeric(5, 2) NOT NULL DEFAULT 5.00,
  opening_time time,
  closing_time time,
  is_24x7 boolean NOT NULL DEFAULT false,
  has_own_delivery boolean NOT NULL DEFAULT false,
  supports_platform_delivery boolean NOT NULL DEFAULT true,
  cold_chain_capable boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pharmacies_status_check CHECK (
    status IN (
      'DRAFT',
      'DOCUMENT_SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
      'BLACKLISTED'
    )
  ),
  CONSTRAINT pharmacies_latitude_check CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT pharmacies_longitude_check CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT pharmacies_trust_score_check CHECK (
    trust_score BETWEEN 0 AND 100
  ),
  CONSTRAINT pharmacies_service_radius_check CHECK (
    service_radius_km > 0 AND service_radius_km <= 25
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pharmacies_license_number_unique_idx
  ON pharmacies (license_number);

CREATE INDEX IF NOT EXISTS pharmacies_owner_user_idx
  ON pharmacies (owner_user_id);

CREATE INDEX IF NOT EXISTS pharmacies_status_city_idx
  ON pharmacies (status, city);

CREATE INDEX IF NOT EXISTS pharmacies_location_idx
  ON pharmacies (latitude, longitude);

CREATE TABLE IF NOT EXISTS pharmacy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  document_type varchar(80) NOT NULL,
  file_url text NOT NULL,
  document_number varchar(120),
  expires_at date,
  status varchar(40) NOT NULL DEFAULT 'UPLOADED',
  rejection_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT pharmacy_documents_type_check CHECK (
    document_type IN (
      'DRUG_LICENSE',
      'GST_CERTIFICATE',
      'SHOP_REGISTRATION',
      'OWNER_KYC',
      'PHARMACIST_REGISTRATION_CERTIFICATE',
      'BANK_ACCOUNT',
      'STORE_ADDRESS_PROOF',
      'INVOICE_FORMAT',
      'RETURN_POLICY_AGREEMENT',
      'PLATFORM_SERVICE_AGREEMENT',
      'PENALTY_AGREEMENT',
      'PRESCRIPTION_COMPLIANCE_DECLARATION'
    )
  ),
  CONSTRAINT pharmacy_documents_status_check CHECK (
    status IN ('UPLOADED', 'APPROVED', 'REJECTED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_documents_type_unique_idx
  ON pharmacy_documents (pharmacy_id, document_type);

CREATE INDEX IF NOT EXISTS pharmacy_documents_pharmacy_idx
  ON pharmacy_documents (pharmacy_id);

CREATE TABLE IF NOT EXISTS pharmacists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  phone varchar(20) NOT NULL,
  registration_number varchar(120) NOT NULL,
  certificate_document_id uuid REFERENCES pharmacy_documents(id) ON DELETE SET NULL,
  status varchar(40) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pharmacists_status_check CHECK (
    status IN (
      'PENDING_VERIFICATION',
      'VERIFIED',
      'REJECTED',
      'INACTIVE'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pharmacists_registration_unique_idx
  ON pharmacists (registration_number);

CREATE INDEX IF NOT EXISTS pharmacists_pharmacy_idx
  ON pharmacists (pharmacy_id);

CREATE TABLE IF NOT EXISTS pharmacy_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  from_status varchar(40),
  to_status varchar(40) NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_status_history_pharmacy_idx
  ON pharmacy_status_history (pharmacy_id, created_at DESC);
