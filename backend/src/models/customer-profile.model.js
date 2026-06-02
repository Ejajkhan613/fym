const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const CUSTOMER_PROFILE_FIELDS = `
    id,
    user_id,
    date_of_birth,
    gender,
    default_address_id,
    abha_id_optional,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    userId: "user_id",
    dateOfBirth: "date_of_birth",
    gender: "gender",
    defaultAddressId: "default_address_id",
    abhaIdOptional: "abha_id_optional"
};

async function createCustomerProfile(input) {
    return insertRow(
        "customer_profiles",
        mapDefinedFields(input, FIELD_MAP),
        CUSTOMER_PROFILE_FIELDS
    );
}

async function findCustomerProfileById(id) {
    const result = await query(
        `
            SELECT ${CUSTOMER_PROFILE_FIELDS}
            FROM customer_profiles
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findCustomerProfileByUserId(userId) {
    const result = await query(
        `
            SELECT ${CUSTOMER_PROFILE_FIELDS}
            FROM customer_profiles
            WHERE user_id = $1
        `,
        [userId]
    );

    return result.rows[0] || null;
}

async function updateCustomerProfile(id, updates) {
    return updateRowById(
        "customer_profiles",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        CUSTOMER_PROFILE_FIELDS
    );
}

async function setCustomerDefaultAddress(userId, defaultAddressId) {
    const result = await query(
        `
            UPDATE customer_profiles
            SET default_address_id = $2
            WHERE user_id = $1
            RETURNING ${CUSTOMER_PROFILE_FIELDS}
        `,
        [userId, defaultAddressId]
    );

    return result.rows[0] || null;
}

module.exports = {
    createCustomerProfile,
    findCustomerProfileById,
    findCustomerProfileByUserId,
    setCustomerDefaultAddress,
    updateCustomerProfile
};
