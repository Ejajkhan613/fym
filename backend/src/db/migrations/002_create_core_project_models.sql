CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT,
    default_address_id UUID,
    abha_id_optional TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_profiles_gender_check CHECK (
        gender IS NULL OR gender IN (
            'MALE',
            'FEMALE',
            'OTHER',
            'PREFER_NOT_TO_SAY'
        )
    )
);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT,
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT addresses_latitude_check CHECK (
        latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
    ),
    CONSTRAINT addresses_longitude_check CHECK (
        longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
    )
);

ALTER TABLE customer_profiles
    ADD CONSTRAINT customer_profiles_default_address_fk
    FOREIGN KEY (default_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user_idx
    ON addresses (user_id)
    WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS addresses_user_id_idx
    ON addresses (user_id);

CREATE INDEX IF NOT EXISTS addresses_city_pincode_idx
    ON addresses (city, pincode);

DROP TRIGGER IF EXISTS customer_profiles_set_updated_at ON customer_profiles;
CREATE TRIGGER customer_profiles_set_updated_at
BEFORE UPDATE ON customer_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS addresses_set_updated_at ON addresses;
CREATE TRIGGER addresses_set_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pharmacists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    certificate_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pharmacists_status_check CHECK (
        status IN (
            'PENDING_VERIFICATION',
            'VERIFIED',
            'REJECTED',
            'SUSPENDED'
        )
    )
);

CREATE INDEX IF NOT EXISTS pharmacists_pharmacy_id_idx
    ON pharmacists (pharmacy_id);

CREATE INDEX IF NOT EXISTS pharmacists_user_id_idx
    ON pharmacists (user_id)
    WHERE user_id IS NOT NULL;

DROP TRIGGER IF EXISTS pharmacists_set_updated_at ON pharmacists;
CREATE TRIGGER pharmacists_set_updated_at
BEFORE UPDATE ON pharmacists
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL,
    generic_name TEXT,
    salt_composition TEXT,
    strength TEXT,
    form TEXT,
    manufacturer TEXT,
    pack_size TEXT,
    mrp NUMERIC(10, 2),
    schedule_category TEXT NOT NULL DEFAULT 'OTC',
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    storage_type TEXT NOT NULL DEFAULT 'NORMAL',
    cold_chain_required BOOLEAN NOT NULL DEFAULT FALSE,
    substitution_group_id UUID,
    therapeutic_class TEXT,
    side_effect_warning TEXT,
    interaction_warning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT medicines_schedule_category_check CHECK (
        schedule_category IN (
            'OTC',
            'PRESCRIPTION',
            'SCHEDULE_H',
            'SCHEDULE_H1',
            'SCHEDULE_X',
            'NARCOTIC',
            'PSYCHOTROPIC',
            'RESTRICTED',
            'UNKNOWN'
        )
    ),
    CONSTRAINT medicines_storage_type_check CHECK (
        storage_type IN (
            'NORMAL',
            'COLD_CHAIN',
            'CONTROLLED_TEMPERATURE'
        )
    ),
    CONSTRAINT medicines_mrp_check CHECK (
        mrp IS NULL OR mrp >= 0
    )
);

CREATE INDEX IF NOT EXISTS medicines_brand_name_idx
    ON medicines (LOWER(brand_name));

CREATE INDEX IF NOT EXISTS medicines_generic_name_idx
    ON medicines (LOWER(generic_name))
    WHERE generic_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS medicines_schedule_category_idx
    ON medicines (schedule_category);

DROP TRIGGER IF EXISTS medicines_set_updated_at ON medicines;
CREATE TRIGGER medicines_set_updated_at
BEFORE UPDATE ON medicines
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0,
    batch_number TEXT NOT NULL DEFAULT '',
    expiry_date DATE,
    price NUMERIC(10, 2),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stock_confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pharmacy_inventory_quantity_check CHECK (
        quantity >= 0
    ),
    CONSTRAINT pharmacy_inventory_price_check CHECK (
        price IS NULL OR price >= 0
    ),
    CONSTRAINT pharmacy_inventory_stock_confidence_check CHECK (
        stock_confidence_score >= 0 AND stock_confidence_score <= 100
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_inventory_batch_unique_idx
    ON pharmacy_inventory (pharmacy_id, medicine_id, batch_number);

CREATE INDEX IF NOT EXISTS pharmacy_inventory_pharmacy_id_idx
    ON pharmacy_inventory (pharmacy_id);

CREATE INDEX IF NOT EXISTS pharmacy_inventory_medicine_id_idx
    ON pharmacy_inventory (medicine_id);

DROP TRIGGER IF EXISTS pharmacy_inventory_set_updated_at ON pharmacy_inventory;
CREATE TRIGGER pharmacy_inventory_set_updated_at
BEFORE UPDATE ON pharmacy_inventory
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    image_url TEXT NOT NULL,
    ocr_text TEXT,
    verification_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    verified_by_pharmacist_id UUID REFERENCES pharmacists(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT prescriptions_verification_status_check CHECK (
        verification_status IN (
            'PENDING_REVIEW',
            'OCR_PROCESSING',
            'NEEDS_MANUAL_REVIEW',
            'VERIFIED',
            'REJECTED',
            'EXPIRED'
        )
    )
);

CREATE INDEX IF NOT EXISTS prescriptions_customer_id_idx
    ON prescriptions (customer_id);

CREATE INDEX IF NOT EXISTS prescriptions_verification_status_idx
    ON prescriptions (verification_status);

DROP TRIGGER IF EXISTS prescriptions_set_updated_at ON prescriptions;
CREATE TRIGGER prescriptions_set_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE RESTRICT,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',
    order_type TEXT NOT NULL DEFAULT 'OTC',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'PAYMENT_PENDING',
    delivery_address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
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
    CONSTRAINT orders_order_type_check CHECK (
        order_type IN (
            'OTC',
            'PRESCRIPTION',
            'MIXED'
        )
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
    ),
    CONSTRAINT orders_amounts_check CHECK (
        subtotal >= 0
        AND delivery_fee >= 0
        AND platform_fee >= 0
        AND discount >= 0
        AND total_amount >= 0
    )
);

CREATE INDEX IF NOT EXISTS orders_customer_id_idx
    ON orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_pharmacy_id_idx
    ON orders (pharmacy_id, created_at DESC)
    WHERE pharmacy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_status_idx
    ON orders (status);

CREATE INDEX IF NOT EXISTS orders_delivery_address_id_idx
    ON orders (delivery_address_id);

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE RESTRICT,
    requested_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    substitution_of_item_id UUID,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT order_items_quantity_check CHECK (
        quantity > 0
    ),
    CONSTRAINT order_items_unit_price_check CHECK (
        unit_price >= 0
    ),
    CONSTRAINT order_items_status_check CHECK (
        status IN (
            'REQUESTED',
            'CONFIRMED',
            'SUBSTITUTION_REQUESTED',
            'SUBSTITUTED',
            'UNAVAILABLE',
            'CANCELLED',
            'DISPENSED'
        )
    )
);

ALTER TABLE order_items
    ADD CONSTRAINT order_items_substitution_fk
    FOREIGN KEY (substitution_of_item_id) REFERENCES order_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
    ON order_items (order_id);

CREATE INDEX IF NOT EXISTS order_items_medicine_id_idx
    ON order_items (medicine_id)
    WHERE medicine_id IS NOT NULL;

DROP TRIGGER IF EXISTS order_items_set_updated_at ON order_items;
CREATE TRIGGER order_items_set_updated_at
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS vendor_order_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'OFFER_SENT',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vendor_order_offers_status_check CHECK (
        status IN (
            'OFFER_SENT',
            'OFFER_VIEWED',
            'OFFER_ACCEPTED',
            'OFFER_REJECTED',
            'OFFER_EXPIRED',
            'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE'
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_order_offers_order_pharmacy_unique_idx
    ON vendor_order_offers (order_id, pharmacy_id);

CREATE INDEX IF NOT EXISTS vendor_order_offers_pharmacy_status_idx
    ON vendor_order_offers (pharmacy_id, status, sent_at DESC);

CREATE INDEX IF NOT EXISTS vendor_order_offers_order_id_idx
    ON vendor_order_offers (order_id);

DROP TRIGGER IF EXISTS vendor_order_offers_set_updated_at ON vendor_order_offers;
CREATE TRIGGER vendor_order_offers_set_updated_at
BEFORE UPDATE ON vendor_order_offers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    penalty_type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    appeal_status TEXT NOT NULL DEFAULT 'NOT_APPEALED',
    appeal_reason TEXT,
    admin_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT penalties_amount_check CHECK (
        amount >= 0
    ),
    CONSTRAINT penalties_status_check CHECK (
        status IN (
            'PENDING',
            'APPLIED',
            'WAIVED',
            'REVERSED'
        )
    ),
    CONSTRAINT penalties_appeal_status_check CHECK (
        appeal_status IN (
            'NOT_APPEALED',
            'PENDING_REVIEW',
            'APPROVED',
            'REJECTED'
        )
    )
);

CREATE INDEX IF NOT EXISTS penalties_pharmacy_id_idx
    ON penalties (pharmacy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS penalties_order_id_idx
    ON penalties (order_id)
    WHERE order_id IS NOT NULL;

DROP TRIGGER IF EXISTS penalties_set_updated_at ON penalties;
CREATE TRIGGER penalties_set_updated_at
BEFORE UPDATE ON penalties
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT NOT NULL,
    actor_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_logs_actor_type_check CHECK (
        actor_type IN (
            'CUSTOMER',
            'PHARMACY',
            'PHARMACIST',
            'DELIVERY_PARTNER',
            'ADMIN',
            'SYSTEM'
        )
    )
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
    ON audit_logs (actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
    ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx
    ON audit_logs (action, created_at DESC);
