const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const PENALTY_FIELDS = `
    id,
    pharmacy_id,
    order_id,
    penalty_type,
    amount,
    reason,
    status,
    appeal_status,
    appeal_reason,
    admin_note,
    resolved_at,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    pharmacyId: "pharmacy_id",
    orderId: "order_id",
    penaltyType: "penalty_type",
    amount: "amount",
    reason: "reason",
    status: "status",
    appealStatus: "appeal_status",
    appealReason: "appeal_reason",
    adminNote: "admin_note",
    resolvedAt: "resolved_at"
};

async function createPenalty(input) {
    return insertRow("penalties", mapDefinedFields(input, FIELD_MAP), PENALTY_FIELDS);
}

async function findPenaltyById(id) {
    const result = await query(
        `
            SELECT ${PENALTY_FIELDS}
            FROM penalties
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function listPenaltiesByPharmacy(pharmacyId, { limit = 50, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${PENALTY_FIELDS}
            FROM penalties
            WHERE pharmacy_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `,
        [pharmacyId, limit, offset]
    );

    return result.rows;
}

async function listPenalties({ pharmacyId = null, status = null, appealStatus = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (pharmacyId) {
        params.push(pharmacyId);
        filters.push(`pharmacy_id = $${params.length}`);
    }

    if (status) {
        params.push(status);
        filters.push(`status = $${params.length}`);
    }

    if (appealStatus) {
        params.push(appealStatus);
        filters.push(`appeal_status = $${params.length}`);
    }

    params.push(limit);
    const limitPosition = params.length;
    params.push(offset);
    const offsetPosition = params.length;
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await query(
        `
            SELECT ${PENALTY_FIELDS}
            FROM penalties
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

async function updatePenalty(id, updates) {
    return updateRowById(
        "penalties",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        PENALTY_FIELDS
    );
}

async function updatePenaltyStatus(id, status, adminNote = null) {
    const resolvedAt = ["WAIVED", "REVERSED"].includes(status) ? new Date() : null;

    return updatePenalty(id, {
        status,
        adminNote,
        resolvedAt
    });
}

async function submitPenaltyAppeal(id, appealReason) {
    return updatePenalty(id, {
        appealStatus: "PENDING_REVIEW",
        appealReason
    });
}

async function resolvePenaltyAppeal(id, appealStatus, adminNote = null) {
    return updatePenalty(id, {
        appealStatus,
        adminNote,
        resolvedAt: new Date()
    });
}

module.exports = {
    createPenalty,
    findPenaltyById,
    listPenalties,
    listPenaltiesByPharmacy,
    resolvePenaltyAppeal,
    submitPenaltyAppeal,
    updatePenalty,
    updatePenaltyStatus
};
