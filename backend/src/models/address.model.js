const { getPool, query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const ADDRESS_FIELDS = `
    id,
    user_id,
    label,
    address_line,
    city,
    state,
    pincode,
    latitude,
    longitude,
    is_default,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    userId: "user_id",
    label: "label",
    addressLine: "address_line",
    city: "city",
    state: "state",
    pincode: "pincode",
    latitude: "latitude",
    longitude: "longitude",
    isDefault: "is_default"
};

async function createAddress(input) {
    return insertRow("addresses", mapDefinedFields(input, FIELD_MAP), ADDRESS_FIELDS);
}

async function findAddressById(id) {
    const result = await query(
        `
            SELECT ${ADDRESS_FIELDS}
            FROM addresses
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findAddressByIdForUser(id, userId) {
    const result = await query(
        `
            SELECT ${ADDRESS_FIELDS}
            FROM addresses
            WHERE id = $1 AND user_id = $2
        `,
        [id, userId]
    );

    return result.rows[0] || null;
}

async function listAddressesByUser(userId) {
    const result = await query(
        `
            SELECT ${ADDRESS_FIELDS}
            FROM addresses
            WHERE user_id = $1
            ORDER BY is_default DESC, created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

async function updateAddress(id, updates) {
    return updateRowById(
        "addresses",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        ADDRESS_FIELDS
    );
}

async function setDefaultAddress(userId, addressId) {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query(
            "UPDATE addresses SET is_default = FALSE WHERE user_id = $1",
            [userId]
        );

        const result = await client.query(
            `
                UPDATE addresses
                SET is_default = TRUE
                WHERE id = $1 AND user_id = $2
                RETURNING ${ADDRESS_FIELDS}
            `,
            [addressId, userId]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        await client.query(
            `
                UPDATE customer_profiles
                SET default_address_id = $2
                WHERE user_id = $1
            `,
            [userId, addressId]
        );

        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function deleteAddressByIdForUser(id, userId) {
    const result = await query(
        `
            DELETE FROM addresses
            WHERE id = $1 AND user_id = $2
            RETURNING ${ADDRESS_FIELDS}
        `,
        [id, userId]
    );

    return result.rows[0] || null;
}

module.exports = {
    createAddress,
    deleteAddressByIdForUser,
    findAddressById,
    findAddressByIdForUser,
    listAddressesByUser,
    setDefaultAddress,
    updateAddress
};
