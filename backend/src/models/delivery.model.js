const { query } = require("../db");

const RIDER_FIELDS = `
    id,
    user_id,
    name,
    phone,
    status,
    current_latitude,
    current_longitude,
    last_location_at,
    created_at,
    updated_at
`;

const ASSIGNMENT_FIELDS = `
    id,
    order_id,
    rider_id,
    status,
    proof_url,
    failure_reason,
    assigned_at,
    picked_up_at,
    delivered_at,
    failed_at,
    created_at,
    updated_at
`;

async function listRiders({ status = null, limit = 50, offset = 0 } = {}) {
    const params = [limit, offset];
    const statusFilter = status ? "WHERE status = $3" : "";

    if (status) {
        params.push(status);
    }

    const result = await query(
        `
            SELECT ${RIDER_FIELDS}
            FROM delivery_riders
            ${statusFilter}
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `,
        params
    );

    return result.rows;
}

async function findRiderById(id) {
    const result = await query(
        `
            SELECT ${RIDER_FIELDS}
            FROM delivery_riders
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function updateRiderLocation(id, { latitude, longitude }) {
    const result = await query(
        `
            UPDATE delivery_riders
            SET current_latitude = $2,
                current_longitude = $3,
                last_location_at = NOW()
            WHERE id = $1
            RETURNING ${RIDER_FIELDS}
        `,
        [id, latitude, longitude]
    );

    return result.rows[0] || null;
}

async function upsertDeliveryAssignment({ orderId, riderId = null, status = "ASSIGNED" }) {
    const result = await query(
        `
            INSERT INTO delivery_assignments (order_id, rider_id, status)
            VALUES ($1, $2, $3)
            ON CONFLICT (order_id)
            DO UPDATE SET
                rider_id = EXCLUDED.rider_id,
                status = EXCLUDED.status,
                assigned_at = NOW()
            RETURNING ${ASSIGNMENT_FIELDS}
        `,
        [orderId, riderId, status]
    );

    return result.rows[0];
}

async function findDeliveryAssignmentByOrder(orderId) {
    const result = await query(
        `
            SELECT ${ASSIGNMENT_FIELDS}
            FROM delivery_assignments
            WHERE order_id = $1
        `,
        [orderId]
    );

    return result.rows[0] || null;
}

async function listDeliveryAssignments({ status = null, limit = 50, offset = 0 } = {}) {
    const params = [limit, offset];
    const statusFilter = status ? "WHERE status = $3" : "";

    if (status) {
        params.push(status);
    }

    const result = await query(
        `
            SELECT ${ASSIGNMENT_FIELDS}
            FROM delivery_assignments
            ${statusFilter}
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `,
        params
    );

    return result.rows;
}

async function updateDeliveryAssignmentByOrder(orderId, updates) {
    const values = [];
    const setters = [];

    for (const [columnName, value] of Object.entries(updates)) {
        if (value !== undefined) {
            values.push(value);
            setters.push(`${columnName} = $${values.length + 1}`);
        }
    }

    if (setters.length === 0) {
        return findDeliveryAssignmentByOrder(orderId);
    }

    const result = await query(
        `
            UPDATE delivery_assignments
            SET ${setters.join(", ")}
            WHERE order_id = $1
            RETURNING ${ASSIGNMENT_FIELDS}
        `,
        [orderId, ...values]
    );

    return result.rows[0] || null;
}

module.exports = {
    findDeliveryAssignmentByOrder,
    findRiderById,
    listDeliveryAssignments,
    listRiders,
    updateDeliveryAssignmentByOrder,
    updateRiderLocation,
    upsertDeliveryAssignment
};
