const { pool: defaultPool } = require("../../db/pool");

const NOTIFICATION_COLUMNS = `
  id,
  recipient_user_id,
  channel,
  template_key,
  title,
  body,
  payload,
  status,
  scheduled_at,
  sent_at,
  failed_at,
  failure_reason,
  created_at,
  updated_at
`;

function mapNotificationRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    channel: row.channel,
    templateKey: row.template_key,
    title: row.title,
    body: row.body,
    payload: row.payload || {},
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    failedAt: row.failed_at,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class NotificationModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async queue(input) {
    const result = await this.pool.query(
      `
        INSERT INTO notifications (
          recipient_user_id,
          channel,
          template_key,
          title,
          body,
          payload,
          scheduled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${NOTIFICATION_COLUMNS}
      `,
      [
        input.recipientUserId || null,
        input.channel,
        input.templateKey,
        input.title || null,
        input.body,
        input.payload || {},
        input.scheduledAt || null,
      ],
    );

    return mapNotificationRow(result.rows[0]);
  }

  async findById(id) {
    const result = await this.pool.query(
      `
        SELECT ${NOTIFICATION_COLUMNS}
        FROM notifications
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapNotificationRow(result.rows[0]);
  }

  async list(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.recipientUserId) {
      values.push(filters.recipientUserId);
      clauses.push(`recipient_user_id = $${values.length}`);
    }

    if (filters.channel) {
      values.push(filters.channel);
      clauses.push(`channel = $${values.length}`);
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
          ${NOTIFICATION_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM notifications
        ${whereSql}
        ORDER BY COALESCE(scheduled_at, created_at) DESC, created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      notifications: result.rows.map(mapNotificationRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateStatus(id, input) {
    const result = await this.pool.query(
      `
        UPDATE notifications
        SET status = $2,
            sent_at = CASE WHEN $2 = 'SENT' THEN now() ELSE sent_at END,
            failed_at = CASE WHEN $2 = 'FAILED' THEN now() ELSE failed_at END,
            failure_reason = CASE
              WHEN $2 IN ('FAILED', 'CANCELLED') THEN COALESCE($3, failure_reason)
              WHEN $2 = 'SENT' THEN NULL
              ELSE failure_reason
            END,
            updated_at = now()
        WHERE id = $1
        RETURNING ${NOTIFICATION_COLUMNS}
      `,
      [id, input.status, input.failureReason || null],
    );

    return mapNotificationRow(result.rows[0]);
  }
}

module.exports = {
  NotificationModel,
  mapNotificationRow,
};
