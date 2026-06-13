const { pool: defaultPool } = require("../../db/pool");

const PENALTY_COLUMNS = `
  id,
  pharmacy_id,
  order_id,
  penalty_type,
  level,
  base_amount,
  customer_inconvenience_fee,
  delivery_loss_fee,
  platform_sla_fee,
  repeat_multiplier,
  amount,
  reason,
  status,
  metadata,
  created_by_user_id,
  created_at,
  updated_at
`;

const APPEAL_COLUMNS = `
  id,
  penalty_id,
  pharmacy_id,
  status,
  reason,
  evidence_urls,
  reviewed_by_user_id,
  review_reason,
  created_at,
  reviewed_at,
  updated_at
`;

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapPenaltyRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    orderId: row.order_id,
    penaltyType: row.penalty_type,
    level: row.level,
    baseAmount: toNumber(row.base_amount),
    customerInconvenienceFee: toNumber(row.customer_inconvenience_fee),
    deliveryLossFee: toNumber(row.delivery_loss_fee),
    platformSlaFee: toNumber(row.platform_sla_fee),
    repeatMultiplier: toNumber(row.repeat_multiplier),
    amount: toNumber(row.amount),
    reason: row.reason,
    status: row.status,
    metadata: row.metadata || {},
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppealRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    penaltyId: row.penalty_id,
    pharmacyId: row.pharmacy_id,
    status: row.status,
    reason: row.reason,
    evidenceUrls: row.evidence_urls || [],
    reviewedByUserId: row.reviewed_by_user_id,
    reviewReason: row.review_reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at,
  };
}

class PenaltyModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async create(input) {
    const result = await this.pool.query(
      `
        INSERT INTO penalties (
          pharmacy_id,
          order_id,
          penalty_type,
          level,
          base_amount,
          customer_inconvenience_fee,
          delivery_loss_fee,
          platform_sla_fee,
          repeat_multiplier,
          amount,
          reason,
          metadata,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING ${PENALTY_COLUMNS}
      `,
      [
        input.pharmacyId,
        input.orderId || null,
        input.penaltyType,
        input.level,
        input.baseAmount,
        input.customerInconvenienceFee,
        input.deliveryLossFee,
        input.platformSlaFee,
        input.repeatMultiplier,
        input.amount,
        input.reason,
        input.metadata || {},
        input.createdByUserId || null,
      ],
    );

    return mapPenaltyRow(result.rows[0]);
  }

  async findById(id) {
    const result = await this.pool.query(
      `
        SELECT ${PENALTY_COLUMNS}
        FROM penalties
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapPenaltyRow(result.rows[0]);
  }

  async list(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.pharmacyId) {
      values.push(filters.pharmacyId);
      clauses.push(`pharmacy_id = $${values.length}`);
    }

    if (filters.orderId) {
      values.push(filters.orderId);
      clauses.push(`order_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${PENALTY_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM penalties
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      penalties: result.rows.map(mapPenaltyRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateStatus(id, input) {
    const result = await this.pool.query(
      `
        UPDATE penalties
        SET status = $2,
            metadata = metadata || $3::jsonb,
            updated_at = now()
        WHERE id = $1
        RETURNING ${PENALTY_COLUMNS}
      `,
      [id, input.status, input.metadata || {}],
    );

    return mapPenaltyRow(result.rows[0]);
  }

  async createAppeal(penalty, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const appealResult = await client.query(
        `
          INSERT INTO penalty_appeals (
            penalty_id,
            pharmacy_id,
            reason,
            evidence_urls
          )
          VALUES ($1, $2, $3, $4)
          RETURNING ${APPEAL_COLUMNS}
        `,
        [
          penalty.id,
          penalty.pharmacyId,
          input.reason,
          input.evidenceUrls || [],
        ],
      );

      await client.query(
        `
          UPDATE penalties
          SET status = 'disputed',
              updated_at = now()
          WHERE id = $1
        `,
        [penalty.id],
      );

      await client.query("COMMIT");
      return mapAppealRow(appealResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listAppeals(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.penaltyId) {
      values.push(filters.penaltyId);
      clauses.push(`penalty_id = $${values.length}`);
    }

    if (filters.pharmacyId) {
      values.push(filters.pharmacyId);
      clauses.push(`pharmacy_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${APPEAL_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM penalty_appeals
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      appeals: result.rows.map(mapAppealRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async reviewAppeal(id, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const appealResult = await client.query(
        `
          UPDATE penalty_appeals
          SET status = $2,
              reviewed_by_user_id = $3,
              review_reason = $4,
              reviewed_at = now(),
              updated_at = now()
          WHERE id = $1
          RETURNING ${APPEAL_COLUMNS}
        `,
        [
          id,
          input.status,
          input.reviewedByUserId || null,
          input.reviewReason || null,
        ],
      );

      const appeal = mapAppealRow(appealResult.rows[0]);

      if (!appeal) {
        await client.query("ROLLBACK");
        return null;
      }

      if (appeal.status === "approved") {
        await client.query(
          `
            UPDATE penalties
            SET status = 'waived',
                updated_at = now()
            WHERE id = $1
          `,
          [appeal.penaltyId],
        );
      } else if (appeal.status === "rejected") {
        await client.query(
          `
            UPDATE penalties
            SET status = 'applied',
                updated_at = now()
            WHERE id = $1
          `,
          [appeal.penaltyId],
        );
      }

      await client.query("COMMIT");
      return appeal;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  PenaltyModel,
  mapPenaltyRow,
  mapAppealRow,
};
