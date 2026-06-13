const { pool: defaultPool } = require("../../db/pool");

const PAYMENT_COLUMNS = `
  id,
  order_id,
  customer_id,
  provider,
  provider_reference,
  payment_method,
  amount,
  currency,
  status,
  metadata,
  created_at,
  updated_at
`;

const REFUND_COLUMNS = `
  id,
  payment_transaction_id,
  order_id,
  amount,
  status,
  reason,
  provider_reference,
  created_at,
  updated_at
`;

function mapPaymentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    provider: row.provider,
    providerReference: row.provider_reference,
    paymentMethod: row.payment_method,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRefundRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    paymentTransactionId: row.payment_transaction_id,
    orderId: row.order_id,
    amount: Number(row.amount),
    status: row.status,
    reason: row.reason,
    providerReference: row.provider_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class PaymentModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async initiate(input) {
    const result = await this.pool.query(
      `
        INSERT INTO payment_transactions (
          order_id,
          customer_id,
          provider,
          provider_reference,
          payment_method,
          amount,
          currency,
          status,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PAYMENT_INITIATED', $8)
        RETURNING ${PAYMENT_COLUMNS}
      `,
      [
        input.orderId,
        input.customerId,
        input.provider,
        input.providerReference || null,
        input.paymentMethod,
        input.amount,
        input.currency || "INR",
        input.metadata || {},
      ],
    );

    return mapPaymentRow(result.rows[0]);
  }

  async findById(id) {
    const result = await this.pool.query(
      `
        SELECT ${PAYMENT_COLUMNS}
        FROM payment_transactions
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapPaymentRow(result.rows[0]);
  }

  async listForOrder(orderId) {
    const result = await this.pool.query(
      `
        SELECT ${PAYMENT_COLUMNS}
        FROM payment_transactions
        WHERE order_id = $1
        ORDER BY created_at DESC
      `,
      [orderId],
    );

    return result.rows.map(mapPaymentRow);
  }

  async updateStatus(id, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const paymentResult = await client.query(
        `
          UPDATE payment_transactions
          SET status = $2,
              provider_reference = COALESCE($3, provider_reference),
              metadata = metadata || $4::jsonb,
              updated_at = now()
          WHERE id = $1
          RETURNING ${PAYMENT_COLUMNS}
        `,
        [
          id,
          input.status,
          input.providerReference || null,
          input.metadata || {},
        ],
      );

      const payment = mapPaymentRow(paymentResult.rows[0]);

      if (!payment) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `
          UPDATE orders
          SET payment_status = $2,
              updated_at = now()
          WHERE id = $1
        `,
        [payment.orderId, input.status],
      );

      await client.query("COMMIT");
      return payment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createRefund(input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const refundResult = await client.query(
        `
          INSERT INTO refunds (
            payment_transaction_id,
            order_id,
            amount,
            status,
            reason,
            provider_reference
          )
          VALUES ($1, $2, $3, 'REFUND_INITIATED', $4, $5)
          RETURNING ${REFUND_COLUMNS}
        `,
        [
          input.paymentTransactionId,
          input.orderId,
          input.amount,
          input.reason || null,
          input.providerReference || null,
        ],
      );

      await client.query(
        `
          UPDATE payment_transactions
          SET status = 'REFUND_INITIATED',
              updated_at = now()
          WHERE id = $1
        `,
        [input.paymentTransactionId],
      );

      await client.query(
        `
          UPDATE orders
          SET payment_status = 'REFUND_INITIATED',
              updated_at = now()
          WHERE id = $1
        `,
        [input.orderId],
      );

      await client.query("COMMIT");
      return mapRefundRow(refundResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRefundStatus(id, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE refunds
          SET status = $2,
              provider_reference = COALESCE($3, provider_reference),
              updated_at = now()
          WHERE id = $1
          RETURNING ${REFUND_COLUMNS}
        `,
        [id, input.status, input.providerReference || null],
      );

      const refund = mapRefundRow(result.rows[0]);

      if (!refund) {
        await client.query("ROLLBACK");
        return null;
      }

      if (refund.status === "REFUND_PROCESSED") {
        await client.query(
          `
            UPDATE payment_transactions
            SET status = 'REFUND_PROCESSED',
                updated_at = now()
            WHERE id = $1
          `,
          [refund.paymentTransactionId],
        );

        await client.query(
          `
            UPDATE orders
            SET payment_status = 'REFUND_PROCESSED',
                updated_at = now()
            WHERE id = $1
          `,
          [refund.orderId],
        );
      }

      await client.query("COMMIT");
      return refund;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  PaymentModel,
  mapPaymentRow,
  mapRefundRow,
};
