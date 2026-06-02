const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const PHARMACY_DOCUMENT_FIELDS = `
    id,
    pharmacy_id,
    document_type,
    document_url,
    status,
    rejection_reason,
    verified_at,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    pharmacyId: "pharmacy_id",
    documentType: "document_type",
    documentUrl: "document_url",
    status: "status",
    rejectionReason: "rejection_reason",
    verifiedAt: "verified_at"
};

async function createPharmacyDocument(input) {
    return insertRow(
        "pharmacy_documents",
        mapDefinedFields(input, FIELD_MAP),
        PHARMACY_DOCUMENT_FIELDS
    );
}

async function findPharmacyDocumentById(id) {
    const result = await query(
        `
            SELECT ${PHARMACY_DOCUMENT_FIELDS}
            FROM pharmacy_documents
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function listPharmacyDocuments(pharmacyId) {
    const result = await query(
        `
            SELECT ${PHARMACY_DOCUMENT_FIELDS}
            FROM pharmacy_documents
            WHERE pharmacy_id = $1
            ORDER BY created_at DESC
        `,
        [pharmacyId]
    );

    return result.rows;
}

async function updatePharmacyDocument(id, updates) {
    return updateRowById(
        "pharmacy_documents",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        PHARMACY_DOCUMENT_FIELDS
    );
}

module.exports = {
    createPharmacyDocument,
    findPharmacyDocumentById,
    listPharmacyDocuments,
    updatePharmacyDocument
};
