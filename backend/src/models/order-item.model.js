const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const ORDER_ITEM_FIELDS = `
    id,
    order_id,
    medicine_id,
    requested_name,
    quantity,
    unit_price,
    substitution_of_item_id,
    requires_prescription,
    status,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    orderId: "order_id",
    medicineId: "medicine_id",
    requestedName: "requested_name",
    quantity: "quantity",
    unitPrice: "unit_price",
    substitutionOfItemId: "substitution_of_item_id",
    requiresPrescription: "requires_prescription",
    status: "status"
};

async function createOrderItem(input) {
    return insertRow(
        "order_items",
        mapDefinedFields(input, FIELD_MAP),
        ORDER_ITEM_FIELDS
    );
}

async function findOrderItemById(id) {
    const result = await query(
        `
            SELECT ${ORDER_ITEM_FIELDS}
            FROM order_items
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function listOrderItems(orderId) {
    const result = await query(
        `
            SELECT ${ORDER_ITEM_FIELDS}
            FROM order_items
            WHERE order_id = $1
            ORDER BY created_at ASC
        `,
        [orderId]
    );

    return result.rows;
}

async function updateOrderItem(id, updates) {
    return updateRowById(
        "order_items",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        ORDER_ITEM_FIELDS
    );
}

async function updateOrderItemStatus(id, status) {
    return updateOrderItem(id, { status });
}

module.exports = {
    createOrderItem,
    findOrderItemById,
    listOrderItems,
    updateOrderItem,
    updateOrderItemStatus
};
