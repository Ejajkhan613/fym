CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    requested_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cart_items_quantity_check CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_medicine_unique_idx
    ON cart_items (user_id, medicine_id)
    WHERE medicine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cart_items_user_id_idx
    ON cart_items (user_id);

DROP TRIGGER IF EXISTS cart_items_set_updated_at ON cart_items;
CREATE TRIGGER cart_items_set_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'OPEN',
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_tickets_priority_check CHECK (
        priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')
    ),
    CONSTRAINT support_tickets_status_check CHECK (
        status IN ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED')
    )
);

CREATE INDEX IF NOT EXISTS support_tickets_customer_id_idx
    ON support_tickets (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
    ON support_tickets (status, created_at DESC);

DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_set_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_ticket_messages_sender_type_check CHECK (
        sender_type IN ('CUSTOMER', 'ADMIN', 'SYSTEM')
    )
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_idx
    ON support_ticket_messages (ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'GENERAL',
    data_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
    ON notifications (user_id)
    WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    device_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_devices_platform_check CHECK (
        platform IN ('ANDROID', 'IOS', 'WEB')
    ),
    CONSTRAINT notification_devices_status_check CHECK (
        status IN ('ACTIVE', 'INACTIVE')
    )
);

CREATE INDEX IF NOT EXISTS notification_devices_user_id_idx
    ON notification_devices (user_id);

DROP TRIGGER IF EXISTS notification_devices_set_updated_at ON notification_devices;
CREATE TRIGGER notification_devices_set_updated_at
BEFORE UPDATE ON notification_devices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL DEFAULT 'MANUAL',
    provider_payment_id TEXT,
    transaction_type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'INITIATED',
    metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_transactions_amount_check CHECK (amount >= 0),
    CONSTRAINT payment_transactions_type_check CHECK (
        transaction_type IN ('INITIATE', 'AUTHORIZE', 'CAPTURE', 'REFUND', 'WEBHOOK')
    ),
    CONSTRAINT payment_transactions_status_check CHECK (
        status IN ('INITIATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')
    )
);

CREATE INDEX IF NOT EXISTS payment_transactions_order_id_idx
    ON payment_transactions (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx
    ON payment_transactions (user_id, created_at DESC);

DROP TRIGGER IF EXISTS payment_transactions_set_updated_at ON payment_transactions;
CREATE TRIGGER payment_transactions_set_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS delivery_riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    current_latitude NUMERIC(9, 6),
    current_longitude NUMERIC(9, 6),
    last_location_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT delivery_riders_status_check CHECK (
        status IN ('AVAILABLE', 'ASSIGNED', 'OFFLINE', 'SUSPENDED')
    ),
    CONSTRAINT delivery_riders_latitude_check CHECK (
        current_latitude IS NULL OR (
            current_latitude >= -90 AND current_latitude <= 90
        )
    ),
    CONSTRAINT delivery_riders_longitude_check CHECK (
        current_longitude IS NULL OR (
            current_longitude >= -180 AND current_longitude <= 180
        )
    )
);

CREATE INDEX IF NOT EXISTS delivery_riders_status_idx
    ON delivery_riders (status);

DROP TRIGGER IF EXISTS delivery_riders_set_updated_at ON delivery_riders;
CREATE TRIGGER delivery_riders_set_updated_at
BEFORE UPDATE ON delivery_riders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES delivery_riders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ASSIGNED',
    proof_url TEXT,
    failure_reason TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT delivery_assignments_status_check CHECK (
        status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED')
    )
);

CREATE INDEX IF NOT EXISTS delivery_assignments_rider_id_idx
    ON delivery_assignments (rider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_assignments_status_idx
    ON delivery_assignments (status, created_at DESC);

DROP TRIGGER IF EXISTS delivery_assignments_set_updated_at ON delivery_assignments;
CREATE TRIGGER delivery_assignments_set_updated_at
BEFORE UPDATE ON delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
