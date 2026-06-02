const { query } = require("../db");

const PAYMENT_TRANSACTION_FIELDS = `
    id,
    order_id,
    user_id,
    provider,
    provider_payment_id,
    transaction_type,
    amount,
    currency,
    status,
    metadata_json,
    created_at,
    updated_at
`;

async function createPaymentTransaction({
    orderId,
    userId,
    provider = "MANUAL",
    providerPaymentId = null,
    transactionType,
    amount = 0,
    currency = "INR",
    status,
    metadataJson = {}
}) {
    const result = await query(
        `
            INSERT INTO payment_transactions (
                order_id,
                user_id,
                provider,
                provider_payment_id,
                transaction_type,
                amount,
                currency,
                status,
                metadata_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING ${PAYMENT_TRANSACTION_FIELDS}
        `,
        [
            orderId,
            userId,
            provider,
            providerPaymentId,
            transactionType,
            amount,
            currency,
            status,
            metadataJson
        ]
    );

    return result.rows[0];
}

async function listPaymentTransactionsByOrder(orderId) {
    const result = await query(
        `
            SELECT ${PAYMENT_TRANSACTION_FIELDS}
            FROM payment_transactions
            WHERE order_id = $1
            ORDER BY created_at DESC
        `,
        [orderId]
    );

    return result.rows;
}

module.exports = {
    createPaymentTransaction,
    listPaymentTransactionsByOrder
};
