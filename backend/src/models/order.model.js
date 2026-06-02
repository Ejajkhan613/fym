const { getPool, query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const ORDER_FIELDS = `
    id,
    customer_id,
    pharmacy_id,
    prescription_id,
    status,
    order_type,
    subtotal,
    delivery_fee,
    platform_fee,
    discount,
    total_amount,
    payment_status,
    delivery_address_id,
    created_at,
    updated_at,
    accepted_at,
    delivered_at,
    cancelled_at
`;

const FIELD_MAP = {
    customerId: "customer_id",
    pharmacyId: "pharmacy_id",
    prescriptionId: "prescription_id",
    status: "status",
    orderType: "order_type",
    subtotal: "subtotal",
    deliveryFee: "delivery_fee",
    platformFee: "platform_fee",
    discount: "discount",
    totalAmount: "total_amount",
    paymentStatus: "payment_status",
    deliveryAddressId: "delivery_address_id",
    acceptedAt: "accepted_at",
    deliveredAt: "delivered_at",
    cancelledAt: "cancelled_at"
};

async function createOrder(input) {
    return insertRow("orders", mapDefinedFields(input, FIELD_MAP), ORDER_FIELDS);
}

async function findOrderById(id) {
    const result = await query(
        `
            SELECT ${ORDER_FIELDS}
            FROM orders
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function listOrdersByCustomer(customerId, { limit = 50, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${ORDER_FIELDS}
            FROM orders
            WHERE customer_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `,
        [customerId, limit, offset]
    );

    return result.rows;
}

async function listOrdersByPharmacy(pharmacyId, { limit = 50, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${ORDER_FIELDS}
            FROM orders
            WHERE pharmacy_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `,
        [pharmacyId, limit, offset]
    );

    return result.rows;
}

async function listOrders({ status = null, customerId = null, pharmacyId = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (status) {
        params.push(status);
        filters.push(`status = $${params.length}`);
    }

    if (customerId) {
        params.push(customerId);
        filters.push(`customer_id = $${params.length}`);
    }

    if (pharmacyId) {
        params.push(pharmacyId);
        filters.push(`pharmacy_id = $${params.length}`);
    }

    params.push(limit);
    const limitPosition = params.length;
    params.push(offset);
    const offsetPosition = params.length;
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await query(
        `
            SELECT ${ORDER_FIELDS}
            FROM orders
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

async function updateOrder(id, updates) {
    return updateRowById(
        "orders",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        ORDER_FIELDS
    );
}

async function updateOrderStatus(id, status) {
    const timestampUpdates = {};

    if (status === "DELIVERED") {
        timestampUpdates.deliveredAt = new Date();
    }

    if (status.startsWith("CANCELLED") || status === "FAILED_DELIVERY") {
        timestampUpdates.cancelledAt = new Date();
    }

    return updateOrder(id, {
        status,
        ...timestampUpdates
    });
}

async function acceptOrderForPharmacy(orderId, pharmacyId) {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const orderResult = await client.query(
            `
                UPDATE orders
                SET pharmacy_id = $2,
                    status = 'VENDOR_ACCEPTED',
                    accepted_at = NOW()
                WHERE id = $1
                    AND status IN ('VENDOR_MATCHING', 'VENDOR_OFFERED')
                RETURNING ${ORDER_FIELDS}
            `,
            [orderId, pharmacyId]
        );

        if (orderResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        await client.query(
            `
                UPDATE vendor_order_offers
                SET status = 'OFFER_ACCEPTED',
                    responded_at = COALESCE(responded_at, NOW())
                WHERE order_id = $1
                    AND pharmacy_id = $2
            `,
            [orderId, pharmacyId]
        );

        await client.query(
            `
                UPDATE vendor_order_offers
                SET status = 'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE',
                    responded_at = COALESCE(responded_at, NOW())
                WHERE order_id = $1
                    AND pharmacy_id != $2
                    AND status IN ('OFFER_SENT', 'OFFER_VIEWED')
            `,
            [orderId, pharmacyId]
        );

        await client.query("COMMIT");
        return orderResult.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    acceptOrderForPharmacy,
    createOrder,
    findOrderById,
    listOrders,
    listOrdersByCustomer,
    listOrdersByPharmacy,
    updateOrder,
    updateOrderStatus
};
