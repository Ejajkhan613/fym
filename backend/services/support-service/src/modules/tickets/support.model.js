const { pool: defaultPool } = require("../../db/pool");

const TICKET_COLUMNS = `
  id,
  customer_id,
  order_id,
  assigned_to_user_id,
  category,
  priority,
  status,
  subject,
  description,
  resolution,
  metadata,
  created_at,
  updated_at,
  closed_at
`;

const MESSAGE_COLUMNS = `
  id,
  ticket_id,
  sender_user_id,
  sender_type,
  message,
  attachment_urls,
  metadata,
  created_at
`;

function mapTicketRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    assignedToUserId: row.assigned_to_user_id,
    category: row.category,
    priority: row.priority,
    status: row.status,
    subject: row.subject,
    description: row.description,
    resolution: row.resolution,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

function mapMessageRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderUserId: row.sender_user_id,
    senderType: row.sender_type,
    message: row.message,
    attachmentUrls: row.attachment_urls || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

class SupportModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async createTicket(input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const ticketResult = await client.query(
        `
          INSERT INTO support_tickets (
            customer_id,
            order_id,
            category,
            priority,
            subject,
            description,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING ${TICKET_COLUMNS}
        `,
        [
          input.customerId || null,
          input.orderId || null,
          input.category,
          input.priority || "medium",
          input.subject,
          input.description,
          input.metadata || {},
        ],
      );

      const ticket = mapTicketRow(ticketResult.rows[0]);
      const message = await this.addMessageWithClient(client, ticket.id, {
        senderUserId: input.customerId || null,
        senderType: input.customerId ? "customer" : "system",
        message: input.description,
      });

      await client.query("COMMIT");
      return { ticket, messages: [message] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findTicketById(id) {
    const result = await this.pool.query(
      `
        SELECT ${TICKET_COLUMNS}
        FROM support_tickets
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapTicketRow(result.rows[0]);
  }

  async getTicketDetails(id) {
    const [ticket, messages] = await Promise.all([
      this.findTicketById(id),
      this.listMessages(id),
    ]);

    if (!ticket) return null;
    return { ticket, messages };
  }

  async listTickets(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.customerId) {
      values.push(filters.customerId);
      clauses.push(`customer_id = $${values.length}`);
    }

    if (filters.orderId) {
      values.push(filters.orderId);
      clauses.push(`order_id = $${values.length}`);
    }

    if (filters.assignedToUserId) {
      values.push(filters.assignedToUserId);
      clauses.push(`assigned_to_user_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    if (filters.priority) {
      values.push(filters.priority);
      clauses.push(`priority = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${TICKET_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM support_tickets
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      tickets: result.rows.map(mapTicketRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateTicket(id, input) {
    const fields = {
      assignedToUserId: "assigned_to_user_id",
      priority: "priority",
      status: "status",
      resolution: "resolution",
      metadata: "metadata",
    };
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        values.push(input[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) return this.findTicketById(id);

    values.push(input.status || null);
    const requestedStatusParam = values.length;

    values.push(id);

    const result = await this.pool.query(
      `
        UPDATE support_tickets
        SET ${assignments.join(", ")},
            closed_at = CASE
              WHEN $${requestedStatusParam}::text IN ('resolved', 'closed')
              THEN COALESCE(closed_at, now())
              ELSE closed_at
            END,
            updated_at = now()
        WHERE id = $${values.length}
        RETURNING ${TICKET_COLUMNS}
      `,
      values,
    );

    return mapTicketRow(result.rows[0]);
  }

  async addMessage(ticketId, input) {
    const result = await this.pool.query(
      `
        INSERT INTO support_messages (
          ticket_id,
          sender_user_id,
          sender_type,
          message,
          attachment_urls,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${MESSAGE_COLUMNS}
      `,
      [
        ticketId,
        input.senderUserId || null,
        input.senderType,
        input.message,
        input.attachmentUrls || [],
        input.metadata || {},
      ],
    );

    return mapMessageRow(result.rows[0]);
  }

  async addMessageWithClient(client, ticketId, input) {
    const result = await client.query(
      `
        INSERT INTO support_messages (
          ticket_id,
          sender_user_id,
          sender_type,
          message,
          attachment_urls,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${MESSAGE_COLUMNS}
      `,
      [
        ticketId,
        input.senderUserId || null,
        input.senderType,
        input.message,
        input.attachmentUrls || [],
        input.metadata || {},
      ],
    );

    return mapMessageRow(result.rows[0]);
  }

  async listMessages(ticketId) {
    const result = await this.pool.query(
      `
        SELECT ${MESSAGE_COLUMNS}
        FROM support_messages
        WHERE ticket_id = $1
        ORDER BY created_at ASC
      `,
      [ticketId],
    );

    return result.rows.map(mapMessageRow);
  }
}

module.exports = {
  SupportModel,
  mapTicketRow,
  mapMessageRow,
};
