const { query } = require("../db");

const NOTIFICATION_FIELDS = `
    id,
    user_id,
    title,
    body,
    type,
    data_json,
    read_at,
    created_at
`;

const DEVICE_FIELDS = `
    id,
    user_id,
    platform,
    device_token,
    status,
    created_at,
    updated_at
`;

async function listNotificationsByUser(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
    const unreadFilter = unreadOnly ? "AND read_at IS NULL" : "";
    const result = await query(
        `
            SELECT ${NOTIFICATION_FIELDS}
            FROM notifications
            WHERE user_id = $1
                ${unreadFilter}
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `,
        [userId, limit, offset]
    );

    return result.rows;
}

async function markNotificationRead(id, userId) {
    const result = await query(
        `
            UPDATE notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE id = $1 AND user_id = $2
            RETURNING ${NOTIFICATION_FIELDS}
        `,
        [id, userId]
    );

    return result.rows[0] || null;
}

async function registerNotificationDevice({ userId, platform, deviceToken }) {
    const result = await query(
        `
            INSERT INTO notification_devices (user_id, platform, device_token)
            VALUES ($1, $2, $3)
            ON CONFLICT (device_token)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                platform = EXCLUDED.platform,
                status = 'ACTIVE'
            RETURNING ${DEVICE_FIELDS}
        `,
        [userId, platform, deviceToken]
    );

    return result.rows[0];
}

async function unregisterNotificationDevice(id, userId) {
    const result = await query(
        `
            UPDATE notification_devices
            SET status = 'INACTIVE'
            WHERE id = $1 AND user_id = $2
            RETURNING ${DEVICE_FIELDS}
        `,
        [id, userId]
    );

    return result.rows[0] || null;
}

module.exports = {
    listNotificationsByUser,
    markNotificationRead,
    registerNotificationDevice,
    unregisterNotificationDevice
};
