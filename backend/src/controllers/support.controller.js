const {
    createSupportTicket,
    createSupportTicketMessage,
    findSupportTicketById,
    findSupportTicketByIdForCustomer,
    listSupportTicketMessages,
    listSupportTickets,
    updateSupportTicket
} = require("../models/support-ticket.model");
const {
    createHttpError,
    parsePagination,
    sanitizeString
} = require("./controller-utils");

async function ticketWithMessages(ticket) {
    return {
        ...ticket,
        messages: await listSupportTicketMessages(ticket.id)
    };
}

async function listMyTickets(req, res) {
    const tickets = await listSupportTickets({
        customerId: req.user.id,
        ...parsePagination(req.query)
    });

    res.status(200).json({ tickets });
}

async function createMyTicket(req, res) {
    const ticket = await createSupportTicket({
        customerId: req.user.id,
        orderId: sanitizeString(req.body.orderId, "orderId"),
        subject: sanitizeString(req.body.subject, "subject", { required: true }),
        description: sanitizeString(req.body.description, "description"),
        category: sanitizeString(req.body.category, "category", {
            defaultValue: "GENERAL"
        }),
        priority: sanitizeString(req.body.priority, "priority", {
            defaultValue: "NORMAL"
        })
    });

    if (req.body.message) {
        await createSupportTicketMessage({
            ticketId: ticket.id,
            senderUserId: req.user.id,
            senderType: "CUSTOMER",
            message: sanitizeString(req.body.message, "message", { required: true })
        });
    }

    res.status(201).json({ ticket: await ticketWithMessages(ticket) });
}

async function getMyTicket(req, res) {
    const ticket = await findSupportTicketByIdForCustomer(
        req.params.ticketId,
        req.user.id
    );

    if (!ticket) {
        throw createHttpError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    }

    res.status(200).json({ ticket: await ticketWithMessages(ticket) });
}

async function createMyTicketMessage(req, res) {
    const ticket = await findSupportTicketByIdForCustomer(
        req.params.ticketId,
        req.user.id
    );

    if (!ticket) {
        throw createHttpError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    }

    const message = await createSupportTicketMessage({
        ticketId: ticket.id,
        senderUserId: req.user.id,
        senderType: "CUSTOMER",
        message: sanitizeString(req.body.message, "message", { required: true })
    });

    res.status(201).json({ message });
}

async function listAdminTickets(req, res) {
    const tickets = await listSupportTickets({
        customerId: sanitizeString(req.query.customerId, "customerId"),
        status: sanitizeString(req.query.status, "status"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ tickets });
}

async function getAdminTicket(req, res) {
    const ticket = await findSupportTicketById(req.params.ticketId);

    if (!ticket) {
        throw createHttpError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    }

    res.status(200).json({ ticket: await ticketWithMessages(ticket) });
}

async function createAdminTicketMessage(req, res) {
    const ticket = await findSupportTicketById(req.params.ticketId);

    if (!ticket) {
        throw createHttpError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    }

    const message = await createSupportTicketMessage({
        ticketId: ticket.id,
        senderUserId: req.user.id,
        senderType: "ADMIN",
        message: sanitizeString(req.body.message, "message", { required: true })
    });

    res.status(201).json({ message });
}

async function escalateAdminTicket(req, res) {
    const ticket = await updateSupportTicket(req.params.ticketId, {
        status: "ESCALATED",
        priority: "URGENT",
        escalatedAt: new Date()
    });

    if (!ticket) {
        throw createHttpError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    }

    res.status(200).json({ ticket });
}

module.exports = {
    createAdminTicketMessage,
    createMyTicket,
    createMyTicketMessage,
    escalateAdminTicket,
    getAdminTicket,
    getMyTicket,
    listAdminTickets,
    listMyTickets
};
