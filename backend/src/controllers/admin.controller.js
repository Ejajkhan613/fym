const { query } = require("../db");
const { listAuditLogs } = require("../models/audit-log.model");
const { listAddressesByUser } = require("../models/address.model");
const { findCustomerProfileByUserId } = require("../models/customer-profile.model");
const { listOrdersByCustomer } = require("../models/order.model");
const { listSupportTickets } = require("../models/support-ticket.model");
const {
    findUserById,
    listCustomers,
    listUsers,
    updateUserStatus
} = require("../models/user.model");
const {
    createHttpError,
    parsePagination,
    sanitizeString
} = require("./controller-utils");

async function dashboard(req, res) {
    const result = await query(`
        SELECT
            (SELECT COUNT(*)::INT FROM orders WHERE created_at::DATE = CURRENT_DATE) AS orders_today,
            (SELECT COALESCE(SUM(total_amount), 0)::NUMERIC FROM orders WHERE status = 'DELIVERED') AS gmv,
            (SELECT COUNT(*)::INT FROM orders WHERE status = 'DELIVERED') AS delivered_orders,
            (SELECT COUNT(*)::INT FROM orders WHERE status LIKE 'CANCELLED%') AS cancelled_orders,
            (SELECT COUNT(*)::INT FROM pharmacies WHERE status = 'APPROVED') AS active_pharmacies,
            (SELECT COUNT(*)::INT FROM penalties WHERE status IN ('PENDING', 'APPLIED')) AS active_penalties
    `);

    res.status(200).json({ metrics: result.rows[0] });
}

async function listAdminUsers(req, res) {
    const users = await listUsers({
        role: sanitizeString(req.query.role, "role"),
        status: sanitizeString(req.query.status, "status"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ users });
}

async function getAdminUser(req, res) {
    const user = await findUserById(req.params.userId);

    if (!user) {
        throw createHttpError(404, "USER_NOT_FOUND", "User not found");
    }

    res.status(200).json({ user });
}

async function updateAdminUserStatus(req, res) {
    const user = await updateUserStatus(
        req.params.userId,
        sanitizeString(req.body.status, "status", { required: true })
    );

    if (!user) {
        throw createHttpError(404, "USER_NOT_FOUND", "User not found");
    }

    res.status(200).json({ user });
}

async function listAdminCustomers(req, res) {
    const customers = await listCustomers({
        status: sanitizeString(req.query.status, "status"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ customers });
}

async function getAdminCustomer(req, res) {
    const customer = await findUserById(req.params.customerId);

    if (!customer || customer.role !== "CUSTOMER") {
        throw createHttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    }

    const profile = await findCustomerProfileByUserId(customer.id);
    const addresses = await listAddressesByUser(customer.id);

    res.status(200).json({ customer, profile, addresses });
}

async function listAdminCustomerOrders(req, res) {
    const orders = await listOrdersByCustomer(
        req.params.customerId,
        parsePagination(req.query)
    );

    res.status(200).json({ orders });
}

async function listAdminCustomerSupportTickets(req, res) {
    const tickets = await listSupportTickets({
        customerId: req.params.customerId,
        ...parsePagination(req.query)
    });

    res.status(200).json({ tickets });
}

async function listAdminAuditLogs(req, res) {
    const auditLogs = await listAuditLogs({
        actorType: sanitizeString(req.query.actorType, "actorType"),
        entityType: sanitizeString(req.query.entityType, "entityType"),
        action: sanitizeString(req.query.action, "action"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ auditLogs });
}

module.exports = {
    dashboard,
    getAdminCustomer,
    getAdminUser,
    listAdminAuditLogs,
    listAdminCustomerOrders,
    listAdminCustomerSupportTickets,
    listAdminCustomers,
    listAdminUsers,
    updateAdminUserStatus
};
