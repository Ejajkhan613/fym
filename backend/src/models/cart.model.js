const { query } = require("../db");

const CART_ITEM_FIELDS = `
    id,
    user_id,
    medicine_id,
    requested_name,
    quantity,
    created_at,
    updated_at
`;

async function listCartItems(userId) {
    const result = await query(
        `
            SELECT ${CART_ITEM_FIELDS}
            FROM cart_items
            WHERE user_id = $1
            ORDER BY created_at ASC
        `,
        [userId]
    );

    return result.rows;
}

async function addCartItem({ userId, medicineId = null, requestedName, quantity = 1 }) {
    if (medicineId) {
        const result = await query(
            `
                INSERT INTO cart_items (user_id, medicine_id, requested_name, quantity)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, medicine_id)
                WHERE medicine_id IS NOT NULL
                DO UPDATE SET
                    requested_name = EXCLUDED.requested_name,
                    quantity = cart_items.quantity + EXCLUDED.quantity
                RETURNING ${CART_ITEM_FIELDS}
            `,
            [userId, medicineId, requestedName, quantity]
        );

        return result.rows[0];
    }

    const result = await query(
        `
            INSERT INTO cart_items (user_id, requested_name, quantity)
            VALUES ($1, $2, $3)
            RETURNING ${CART_ITEM_FIELDS}
        `,
        [userId, requestedName, quantity]
    );

    return result.rows[0];
}

async function findCartItemByIdForUser(id, userId) {
    const result = await query(
        `
            SELECT ${CART_ITEM_FIELDS}
            FROM cart_items
            WHERE id = $1 AND user_id = $2
        `,
        [id, userId]
    );

    return result.rows[0] || null;
}

async function updateCartItem(id, userId, { quantity, requestedName }) {
    const updates = [];
    const params = [id, userId];

    if (quantity !== undefined) {
        params.push(quantity);
        updates.push(`quantity = $${params.length}`);
    }

    if (requestedName !== undefined) {
        params.push(requestedName);
        updates.push(`requested_name = $${params.length}`);
    }

    if (updates.length === 0) {
        return findCartItemByIdForUser(id, userId);
    }

    const result = await query(
        `
            UPDATE cart_items
            SET ${updates.join(", ")}
            WHERE id = $1 AND user_id = $2
            RETURNING ${CART_ITEM_FIELDS}
        `,
        params
    );

    return result.rows[0] || null;
}

async function deleteCartItem(id, userId) {
    const result = await query(
        `
            DELETE FROM cart_items
            WHERE id = $1 AND user_id = $2
            RETURNING ${CART_ITEM_FIELDS}
        `,
        [id, userId]
    );

    return result.rows[0] || null;
}

async function clearCart(userId) {
    const result = await query(
        `
            DELETE FROM cart_items
            WHERE user_id = $1
            RETURNING ${CART_ITEM_FIELDS}
        `,
        [userId]
    );

    return result.rows;
}

module.exports = {
    addCartItem,
    clearCart,
    deleteCartItem,
    findCartItemByIdForUser,
    listCartItems,
    updateCartItem
};
