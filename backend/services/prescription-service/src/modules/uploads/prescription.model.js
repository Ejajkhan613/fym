const { pool: defaultPool } = require("../../db/pool");

const PRESCRIPTION_COLUMNS = `
  id,
  customer_id,
  order_id,
  file_url,
  file_type,
  ocr_text,
  extracted_items,
  verification_status,
  confidence_score,
  reviewed_by_user_id,
  rejection_reason,
  fraud_flags,
  uploaded_at,
  reviewed_at,
  created_at,
  updated_at
`;

function mapPrescriptionRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    fileUrl: row.file_url,
    fileType: row.file_type,
    ocrText: row.ocr_text,
    extractedItems: row.extracted_items || [],
    verificationStatus: row.verification_status,
    confidenceScore:
      row.confidence_score === null ? null : Number(row.confidence_score),
    reviewedByUserId: row.reviewed_by_user_id,
    rejectionReason: row.rejection_reason,
    fraudFlags: row.fraud_flags || [],
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class PrescriptionModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async create(input) {
    const result = await this.pool.query(
      `
        INSERT INTO prescriptions (
          customer_id,
          order_id,
          file_url,
          file_type,
          verification_status
        )
        VALUES ($1, $2, $3, $4, 'OCR_PENDING')
        RETURNING ${PRESCRIPTION_COLUMNS}
      `,
      [
        input.customerId,
        input.orderId || null,
        input.fileUrl,
        input.fileType || "image",
      ],
    );

    return mapPrescriptionRow(result.rows[0]);
  }

  async findById(id) {
    const result = await this.pool.query(
      `
        SELECT ${PRESCRIPTION_COLUMNS}
        FROM prescriptions
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapPrescriptionRow(result.rows[0]);
  }

  async list(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.customerId) {
      values.push(filters.customerId);
      clauses.push(`customer_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`verification_status = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${PRESCRIPTION_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM prescriptions
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      prescriptions: result.rows.map(mapPrescriptionRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateOcr(id, input) {
    const result = await this.pool.query(
      `
        UPDATE prescriptions
        SET ocr_text = $2,
            extracted_items = $3,
            confidence_score = $4,
            verification_status = 'OCR_COMPLETED',
            updated_at = now()
        WHERE id = $1
        RETURNING ${PRESCRIPTION_COLUMNS}
      `,
      [
        id,
        input.ocrText || null,
        input.extractedItems || [],
        input.confidenceScore ?? null,
      ],
    );

    return mapPrescriptionRow(result.rows[0]);
  }

  async linkToOrder(id, orderId) {
    const result = await this.pool.query(
      `
        UPDATE prescriptions
        SET order_id = $2,
            updated_at = now()
        WHERE id = $1
        RETURNING ${PRESCRIPTION_COLUMNS}
      `,
      [id, orderId],
    );

    return mapPrescriptionRow(result.rows[0]);
  }

  async deleteById(id) {
    const result = await this.pool.query(
      `
        DELETE FROM prescriptions
        WHERE id = $1
        RETURNING ${PRESCRIPTION_COLUMNS}
      `,
      [id],
    );

    return mapPrescriptionRow(result.rows[0]);
  }

  async updateStatus(id, input) {
    const result = await this.pool.query(
      `
        UPDATE prescriptions
        SET verification_status = $2,
            reviewed_by_user_id = COALESCE($3, reviewed_by_user_id),
            rejection_reason = $4,
            fraud_flags = COALESCE($5, fraud_flags),
            reviewed_at = CASE
              WHEN $2 IN ('APPROVED', 'REJECTED', 'FLAGGED') THEN now()
              ELSE reviewed_at
            END,
            updated_at = now()
        WHERE id = $1
        RETURNING ${PRESCRIPTION_COLUMNS}
      `,
      [
        id,
        input.status,
        input.reviewedByUserId || null,
        input.rejectionReason || null,
        input.fraudFlags || null,
      ],
    );

    return mapPrescriptionRow(result.rows[0]);
  }
}

module.exports = {
  PrescriptionModel,
  mapPrescriptionRow,
};
