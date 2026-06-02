const { query } = require("../db");
const { mapDefinedFields, updateRowById } = require("./model-utils");

const PHARMACY_FIELDS = `
    id,
    owner_user_id,
    name,
    license_number,
    license_valid_from,
    license_valid_to,
    gst_number,
    address_line,
    city,
    state,
    pincode,
    latitude,
    longitude,
    status,
    trust_score,
    service_radius_km,
    opening_time,
    closing_time,
    is_24x7,
    delivery_capability,
    cold_chain_capable,
    created_at,
    updated_at
`;

async function createPharmacy({
    ownerUserId,
    name,
    licenseNumber,
    licenseValidFrom = null,
    licenseValidTo = null,
    gstNumber = null,
    addressLine,
    city,
    state,
    pincode,
    latitude = null,
    longitude = null,
    status = "DRAFT",
    serviceRadiusKm = 5,
    openingTime = null,
    closingTime = null,
    is24x7 = false,
    deliveryCapability = "NONE",
    coldChainCapable = false
}) {
    const result = await query(
        `
            INSERT INTO pharmacies (
                owner_user_id,
                name,
                license_number,
                license_valid_from,
                license_valid_to,
                gst_number,
                address_line,
                city,
                state,
                pincode,
                latitude,
                longitude,
                status,
                service_radius_km,
                opening_time,
                closing_time,
                is_24x7,
                delivery_capability,
                cold_chain_capable
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19
            )
            RETURNING ${PHARMACY_FIELDS}
        `,
        [
            ownerUserId,
            name,
            licenseNumber,
            licenseValidFrom,
            licenseValidTo,
            gstNumber,
            addressLine,
            city,
            state,
            pincode,
            latitude,
            longitude,
            status,
            serviceRadiusKm,
            openingTime,
            closingTime,
            is24x7,
            deliveryCapability,
            coldChainCapable
        ]
    );

    return result.rows[0];
}

async function findPharmacyById(id) {
    const result = await query(
        `
            SELECT ${PHARMACY_FIELDS}
            FROM pharmacies
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findPharmacyByIdForOwner(id, ownerUserId) {
    const result = await query(
        `
            SELECT ${PHARMACY_FIELDS}
            FROM pharmacies
            WHERE id = $1 AND owner_user_id = $2
        `,
        [id, ownerUserId]
    );

    return result.rows[0] || null;
}

async function findPharmacyByLicenseNumber(licenseNumber) {
    const result = await query(
        `
            SELECT ${PHARMACY_FIELDS}
            FROM pharmacies
            WHERE license_number = $1
        `,
        [licenseNumber]
    );

    return result.rows[0] || null;
}

async function findPrimaryPharmacyByOwner(ownerUserId) {
    const result = await query(
        `
            SELECT ${PHARMACY_FIELDS}
            FROM pharmacies
            WHERE owner_user_id = $1
            ORDER BY created_at ASC
            LIMIT 1
        `,
        [ownerUserId]
    );

    return result.rows[0] || null;
}

async function listPharmaciesByOwner(ownerUserId) {
    const result = await query(
        `
            SELECT ${PHARMACY_FIELDS}
            FROM pharmacies
            WHERE owner_user_id = $1
            ORDER BY created_at DESC
        `,
        [ownerUserId]
    );

    return result.rows;
}

async function listPharmacies({ status = null, city = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (status) {
        params.push(status);
        filters.push(`status = $${params.length}`);
    }

    if (city) {
        params.push(city);
        filters.push(`LOWER(city) = LOWER($${params.length})`);
    }

    params.push(limit);
    const limitPosition = params.length;
    params.push(offset);
    const offsetPosition = params.length;

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await query(
        `
            SELECT ${PHARMACY_FIELDS}
            FROM pharmacies
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

async function updatePharmacy(id, updates) {
    const payload = mapDefinedFields(updates, {
        name: "name",
        licenseNumber: "license_number",
        licenseValidFrom: "license_valid_from",
        licenseValidTo: "license_valid_to",
        gstNumber: "gst_number",
        addressLine: "address_line",
        city: "city",
        state: "state",
        pincode: "pincode",
        latitude: "latitude",
        longitude: "longitude",
        status: "status",
        trustScore: "trust_score",
        serviceRadiusKm: "service_radius_km",
        openingTime: "opening_time",
        closingTime: "closing_time",
        is24x7: "is_24x7",
        deliveryCapability: "delivery_capability",
        coldChainCapable: "cold_chain_capable"
    });

    if (Object.keys(payload).length === 0) {
        return findPharmacyById(id);
    }

    return updateRowById("pharmacies", id, payload, PHARMACY_FIELDS);
}

async function updatePharmacyStatus(id, status) {
    const result = await query(
        `
            UPDATE pharmacies
            SET status = $2
            WHERE id = $1
            RETURNING ${PHARMACY_FIELDS}
        `,
        [id, status]
    );

    return result.rows[0] || null;
}

module.exports = {
    createPharmacy,
    findPharmacyById,
    findPharmacyByIdForOwner,
    findPharmacyByLicenseNumber,
    findPrimaryPharmacyByOwner,
    listPharmacies,
    listPharmaciesByOwner,
    updatePharmacy,
    updatePharmacyStatus
};
