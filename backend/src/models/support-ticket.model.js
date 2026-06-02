const { query } = require("../db");

const SUPPORT_TICKET_FIELDS = `
    id,
    customer_id,
    order_id,
    subject,
    description,
    category,
    priority,
    status,
    escalated_at,
    created_at,
    updated_at
`;

const SUPPORT_MESSAGE_FIELDS = `
    id,
    ticket_id,
    sender_user_id,
    sender_type,
    message,
    created_at
`;

async function createSupportTicket({
    customerId,
    orderId = null,
    subject,
    description = null,
    category = "GENERAL",
    priority = "NORMAL"
}) {
    const result = await query(
        `
            INSERT INTO support_tickets (
                customer_id,
                order_id,
                subject,
                description,
                category,
                priority
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING ${SUPPORT_TICKET_FIELDS}
        `,
        [customerId, orderId, subject, description, category, priority]
    );

    return result.rows[0];
}

async function findSupportTicketById(id) {
    const result = await query(
        `
            SELECT ${SUPPORT_TICKET_FIELDS}
            FROM support_tickets
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findSupportTicketByIdForCustomer(id, customerId) {
    const result = await query(
        `
            SELECT ${SUPPORT_TICKET_FIELDS}
            FROM support_tickets
            WHERE id = $1 AND customer_id = $2
        `,
        [id, customerId]
    );

    return result.rows[0] || null;
}

async function listSupportTickets({ customerId = null, status = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (customerId) {
        params.push(customerId);
        filters.push(`customer_id = $${params.length}`);
    }

    if (status) {
        params.push(status);
        filters.push(`status = $${params.length}`);
    }

    params.push(limit);
    const limitPosition = params.length;
    params.push(offset);
    const offsetPosition = params.length;
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await query(
        `
            SELECT ${SUPPORT_TICKET_FIELDS}
            FROM support_tickets
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

async function updateSupportTicket(id, { status, priority, escalatedAt }) {
    const updates = [];
    const params = [id];

    if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);
    }

    if (priority !== undefined) {
        params.push(priority);
        updates.push(`priority = $${params.length}`);
    }

    if (escalatedAt !== undefined) {
        params.push(escalatedAt);
        updates.push(`escalated_at = $${params.length}`);
    }

    if (updates.length === 0) {
        return findSupportTicketById(id);
    }

    const result = await query(
        `
            UPDATE support_tickets
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING ${SUPPORT_TICKET_FIELDS}
        `,
        params
    );

    return result.rows[0] || null;
}

async function createSupportTicketMessage({
    ticketId,
    senderUserId = null,
    senderType,
    message
}) {
    const result = await query(
        `
            INSERT INTO support_ticket_messages (
                ticket_id,
                sender_user_id,
                sender_type,
                message
            )
            VALUES ($1, $2, $3, $4)
            RETURNING ${SUPPORT_MESSAGE_FIELDS}
        `,
        [ticketId, senderUserId, senderType, message]
    );

    return result.rows[0];
}

async function listSupportTicketMessages(ticketId) {
    const result = await query(
        `
            SELECT ${SUPPORT_MESSAGE_FIELDS}
            FROM support_ticket_messages
            WHERE ticket_id = $1
            ORDER BY created_at ASC
        `,
        [ticketId]
    );

    return result.rows;
}

module.exports = {
    createSupportTicket,
    createSupportTicketMessage,
    findSupportTicketById,
    findSupportTicketByIdForCustomer,
    listSupportTicketMessages,
    listSupportTickets,
    updateSupportTicket
};
