const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const PHARMACIST_FIELDS = `
    id,
    pharmacy_id,
    user_id,
    name,
    registration_number,
    certificate_url,
    status,
    verified_at,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    pharmacyId: "pharmacy_id",
    userId: "user_id",
    name: "name",
    registrationNumber: "registration_number",
    certificateUrl: "certificate_url",
    status: "status",
    verifiedAt: "verified_at"
};

async function createPharmacist(input) {
    return insertRow(
        "pharmacists",
        mapDefinedFields(input, FIELD_MAP),
        PHARMACIST_FIELDS
    );
}

async function findPharmacistById(id) {
    const result = await query(
        `
            SELECT ${PHARMACIST_FIELDS}
            FROM pharmacists
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findPharmacistByRegistrationNumber(registrationNumber) {
    const result = await query(
        `
            SELECT ${PHARMACIST_FIELDS}
            FROM pharmacists
            WHERE registration_number = $1
        `,
        [registrationNumber]
    );

    return result.rows[0] || null;
}

async function listPharmacistsByPharmacy(pharmacyId) {
    const result = await query(
        `
            SELECT ${PHARMACIST_FIELDS}
            FROM pharmacists
            WHERE pharmacy_id = $1
            ORDER BY created_at DESC
        `,
        [pharmacyId]
    );

    return result.rows;
}

async function listPharmacists({ status = null, pharmacyId = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (status) {
        params.push(status);
        filters.push(`status = $${params.length}`);
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
            SELECT ${PHARMACIST_FIELDS}
            FROM pharmacists
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

async function updatePharmacist(id, updates) {
    return updateRowById(
        "pharmacists",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        PHARMACIST_FIELDS
    );
}

async function updatePharmacistStatus(id, status) {
    const verifiedAt = status === "VERIFIED" ? new Date() : null;

    return updatePharmacist(id, {
        status,
        verifiedAt
    });
}

module.exports = {
    createPharmacist,
    findPharmacistById,
    findPharmacistByRegistrationNumber,
    listPharmacists,
    listPharmacistsByPharmacy,
    updatePharmacist,
    updatePharmacistStatus
};
