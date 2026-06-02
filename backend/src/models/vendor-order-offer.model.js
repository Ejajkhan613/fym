const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const VENDOR_ORDER_OFFER_FIELDS = `
    id,
    order_id,
    pharmacy_id,
    status,
    sent_at,
    viewed_at,
    responded_at,
    expires_at,
    rejection_reason,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    orderId: "order_id",
    pharmacyId: "pharmacy_id",
    status: "status",
    sentAt: "sent_at",
    viewedAt: "viewed_at",
    respondedAt: "responded_at",
    expiresAt: "expires_at",
    rejectionReason: "rejection_reason"
};

async function createVendorOrderOffer(input) {
    return insertRow(
        "vendor_order_offers",
        mapDefinedFields(input, FIELD_MAP),
        VENDOR_ORDER_OFFER_FIELDS
    );
}

async function findVendorOrderOfferById(id) {
    const result = await query(
        `
            SELECT ${VENDOR_ORDER_OFFER_FIELDS}
            FROM vendor_order_offers
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findVendorOrderOffer({ orderId, pharmacyId }) {
    const result = await query(
        `
            SELECT ${VENDOR_ORDER_OFFER_FIELDS}
            FROM vendor_order_offers
            WHERE order_id = $1 AND pharmacy_id = $2
        `,
        [orderId, pharmacyId]
    );

    return result.rows[0] || null;
}

async function listOffersForPharmacy(
    pharmacyId,
    { status = null, limit = 50, offset = 0 } = {}
) {
    const params = [pharmacyId, limit, offset];
    const statusFilter = status ? "AND status = $4" : "";

    if (status) {
        params.push(status);
    }

    const result = await query(
        `
            SELECT ${VENDOR_ORDER_OFFER_FIELDS}
            FROM vendor_order_offers
            WHERE pharmacy_id = $1
                ${statusFilter}
            ORDER BY sent_at DESC
            LIMIT $2 OFFSET $3
        `,
        params
    );

    return result.rows;
}

async function listOffersForOrder(orderId) {
    const result = await query(
        `
            SELECT ${VENDOR_ORDER_OFFER_FIELDS}
            FROM vendor_order_offers
            WHERE order_id = $1
            ORDER BY sent_at ASC
        `,
        [orderId]
    );

    return result.rows;
}

async function updateVendorOrderOffer(id, updates) {
    return updateRowById(
        "vendor_order_offers",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        VENDOR_ORDER_OFFER_FIELDS
    );
}

async function markOfferViewed(id) {
    return updateVendorOrderOffer(id, {
        status: "OFFER_VIEWED",
        viewedAt: new Date()
    });
}

async function rejectVendorOrderOffer(id, rejectionReason = null) {
    return updateVendorOrderOffer(id, {
        status: "OFFER_REJECTED",
        respondedAt: new Date(),
        rejectionReason
    });
}

module.exports = {
    createVendorOrderOffer,
    findVendorOrderOffer,
    findVendorOrderOfferById,
    listOffersForOrder,
    listOffersForPharmacy,
    markOfferViewed,
    rejectVendorOrderOffer,
    updateVendorOrderOffer
};
