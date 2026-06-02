const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const INVENTORY_FIELDS = `
    id,
    pharmacy_id,
    medicine_id,
    quantity,
    batch_number,
    expiry_date,
    price,
    last_updated_at,
    stock_confidence_score,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    pharmacyId: "pharmacy_id",
    medicineId: "medicine_id",
    quantity: "quantity",
    batchNumber: "batch_number",
    expiryDate: "expiry_date",
    price: "price",
    stockConfidenceScore: "stock_confidence_score"
};

async function createInventoryItem(input) {
    return insertRow(
        "pharmacy_inventory",
        mapDefinedFields(input, FIELD_MAP),
        INVENTORY_FIELDS
    );
}

async function findInventoryItemById(id) {
    const result = await query(
        `
            SELECT ${INVENTORY_FIELDS}
            FROM pharmacy_inventory
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findInventoryItem({ pharmacyId, medicineId, batchNumber = "" }) {
    const result = await query(
        `
            SELECT ${INVENTORY_FIELDS}
            FROM pharmacy_inventory
            WHERE pharmacy_id = $1
                AND medicine_id = $2
                AND batch_number = $3
        `,
        [pharmacyId, medicineId, batchNumber]
    );

    return result.rows[0] || null;
}

async function listInventoryByPharmacy(pharmacyId, { limit = 100, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${INVENTORY_FIELDS}
            FROM pharmacy_inventory
            WHERE pharmacy_id = $1
            ORDER BY last_updated_at DESC
            LIMIT $2 OFFSET $3
        `,
        [pharmacyId, limit, offset]
    );

    return result.rows;
}

async function updateInventoryItem(id, updates) {
    const payload = mapDefinedFields(updates, FIELD_MAP);
    payload.last_updated_at = new Date();

    return updateRowById(
        "pharmacy_inventory",
        id,
        payload,
        INVENTORY_FIELDS
    );
}

async function deleteInventoryItemById(id) {
    const result = await query(
        `
            DELETE FROM pharmacy_inventory
            WHERE id = $1
            RETURNING ${INVENTORY_FIELDS}
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function upsertInventoryItem(input) {
    const {
        pharmacyId,
        medicineId,
        quantity = 0,
        batchNumber = "",
        expiryDate = null,
        price = null,
        stockConfidenceScore = 50
    } = input;

    const result = await query(
        `
            INSERT INTO pharmacy_inventory (
                pharmacy_id,
                medicine_id,
                quantity,
                batch_number,
                expiry_date,
                price,
                stock_confidence_score,
                last_updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (pharmacy_id, medicine_id, batch_number)
            DO UPDATE SET
                quantity = EXCLUDED.quantity,
                expiry_date = EXCLUDED.expiry_date,
                price = EXCLUDED.price,
                stock_confidence_score = EXCLUDED.stock_confidence_score,
                last_updated_at = NOW()
            RETURNING ${INVENTORY_FIELDS}
        `,
        [
            pharmacyId,
            medicineId,
            quantity,
            batchNumber,
            expiryDate,
            price,
            stockConfidenceScore
        ]
    );

    return result.rows[0];
}

module.exports = {
    createInventoryItem,
    deleteInventoryItemById,
    findInventoryItem,
    findInventoryItemById,
    listInventoryByPharmacy,
    updateInventoryItem,
    upsertInventoryItem
};
