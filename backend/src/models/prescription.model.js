const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const PRESCRIPTION_FIELDS = `
    id,
    customer_id,
    image_url,
    ocr_text,
    verification_status,
    verified_by_pharmacist_id,
    rejection_reason,
    metadata_json,
    verified_at,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    customerId: "customer_id",
    imageUrl: "image_url",
    ocrText: "ocr_text",
    verificationStatus: "verification_status",
    verifiedByPharmacistId: "verified_by_pharmacist_id",
    rejectionReason: "rejection_reason",
    metadataJson: "metadata_json",
    verifiedAt: "verified_at"
};

async function createPrescription(input) {
    return insertRow(
        "prescriptions",
        mapDefinedFields(input, FIELD_MAP),
        PRESCRIPTION_FIELDS
    );
}

async function findPrescriptionById(id) {
    const result = await query(
        `
            SELECT ${PRESCRIPTION_FIELDS}
            FROM prescriptions
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function listPrescriptionsByCustomer(customerId, { limit = 50, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${PRESCRIPTION_FIELDS}
            FROM prescriptions
            WHERE customer_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `,
        [customerId, limit, offset]
    );

    return result.rows;
}

async function listPrescriptions({ verificationStatus = null, limit = 50, offset = 0 } = {}) {
    const params = [limit, offset];
    const statusFilter = verificationStatus ? "WHERE verification_status = $3" : "";

    if (verificationStatus) {
        params.push(verificationStatus);
    }

    const result = await query(
        `
            SELECT ${PRESCRIPTION_FIELDS}
            FROM prescriptions
            ${statusFilter}
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `,
        params
    );

    return result.rows;
}

async function updatePrescription(id, updates) {
    return updateRowById(
        "prescriptions",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        PRESCRIPTION_FIELDS
    );
}

async function updatePrescriptionVerification({
    id,
    verificationStatus,
    verifiedByPharmacistId = null,
    rejectionReason = null
}) {
    const verifiedAt = verificationStatus === "VERIFIED" ? new Date() : null;

    return updatePrescription(id, {
        verificationStatus,
        verifiedByPharmacistId,
        rejectionReason,
        verifiedAt
    });
}

module.exports = {
    createPrescription,
    findPrescriptionById,
    listPrescriptions,
    listPrescriptionsByCustomer,
    updatePrescription,
    updatePrescriptionVerification
};
