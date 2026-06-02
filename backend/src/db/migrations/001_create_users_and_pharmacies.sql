CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_role_check CHECK (
        role IN (
            'CUSTOMER',
            'PHARMACY_OWNER',
            'PHARMACIST',
            'DELIVERY_PARTNER',
            'ADMIN'
        )
    ),
    CONSTRAINT users_status_check CHECK (
        status IN (
            'PENDING_VERIFICATION',
            'ACTIVE',
            'INACTIVE',
            'BLOCKED'
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email))
    WHERE email IS NOT NULL;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    license_number TEXT NOT NULL UNIQUE,
    license_valid_from DATE,
    license_valid_to DATE,
    gst_number TEXT,
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    status TEXT NOT NULL DEFAULT 'DRAFT',
    trust_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 5,
    opening_time TIME,
    closing_time TIME,
    is_24x7 BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_capability TEXT NOT NULL DEFAULT 'NONE',
    cold_chain_capable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
    CONSTRAINT pharmacies_delivery_capability_check CHECK (
        delivery_capability IN (
            'NONE',
            'PHARMACY_DELIVERY',
            'PLATFORM_DELIVERY',
            'HYBRID'
        )
    ),
    CONSTRAINT pharmacies_trust_score_check CHECK (
        trust_score >= 0 AND trust_score <= 100
    ),
    CONSTRAINT pharmacies_service_radius_check CHECK (
        service_radius_km > 0
    ),
    CONSTRAINT pharmacies_latitude_check CHECK (
        latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
    ),
    CONSTRAINT pharmacies_longitude_check CHECK (
        longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
    )
);

CREATE INDEX IF NOT EXISTS pharmacies_owner_user_id_idx
    ON pharmacies (owner_user_id);

CREATE INDEX IF NOT EXISTS pharmacies_city_status_idx
    ON pharmacies (city, status);

CREATE INDEX IF NOT EXISTS pharmacies_location_idx
    ON pharmacies (city, latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER pharmacies_set_updated_at
BEFORE UPDATE ON pharmacies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
