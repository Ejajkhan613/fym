const {
    createPaymentTransaction,
    listPaymentTransactionsByOrder
} = require("../models/payment-transaction.model");
const { findOrderById, updateOrder } = require("../models/order.model");
const {
    createHttpError,
    sanitizeNumber,
    sanitizeString
} = require("./controller-utils");

async function requirePaymentOrder(orderId, userId) {
    const order = await findOrderById(orderId);

    if (!order || order.customer_id !== userId) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    return order;
}

async function recordPayment(req, res, transactionType, paymentStatus, transactionStatus) {
    const order = await requirePaymentOrder(req.params.orderId, req.user.id);
    const amount = sanitizeNumber(req.body.amount, "amount", {
        min: 0,
        defaultValue: order.total_amount
    });
    const transaction = await createPaymentTransaction({
        orderId: order.id,
        userId: req.user.id,
        provider: sanitizeString(req.body.provider, "provider", {
            defaultValue: "MANUAL"
        }),
        providerPaymentId: sanitizeString(
            req.body.providerPaymentId,
            "providerPaymentId"
        ),
        transactionType,
        amount,
        currency: sanitizeString(req.body.currency, "currency", {
            defaultValue: "INR"
        }),
        status: transactionStatus,
        metadataJson: req.body.metadataJson || {}
    });
    const updatedOrder = await updateOrder(order.id, {
        paymentStatus
    });

    res.status(200).json({
        order: updatedOrder,
        transaction
    });
}

async function initiatePayment(req, res) {
    return recordPayment(req, res, "INITIATE", "PAYMENT_INITIATED", "INITIATED");
}

async function authorizePayment(req, res) {
    return recordPayment(req, res, "AUTHORIZE", "PAYMENT_AUTHORIZED", "AUTHORIZED");
}

async function capturePayment(req, res) {
    return recordPayment(req, res, "CAPTURE", "PAYMENT_CAPTURED", "CAPTURED");
}

async function refundPayment(req, res) {
    return recordPayment(req, res, "REFUND", "REFUND_INITIATED", "REFUNDED");
}

async function providerWebhook(req, res) {
    const orderId = sanitizeString(req.body.orderId, "orderId", { required: true });
    const order = await findOrderById(orderId);

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    const transaction = await createPaymentTransaction({
        orderId: order.id,
        userId: order.customer_id,
        provider: sanitizeString(req.body.provider, "provider", {
            defaultValue: "WEBHOOK"
        }),
        providerPaymentId: sanitizeString(
            req.body.providerPaymentId,
            "providerPaymentId"
        ),
        transactionType: "WEBHOOK",
        amount: sanitizeNumber(req.body.amount, "amount", {
            min: 0,
            defaultValue: order.total_amount
        }),
        currency: sanitizeString(req.body.currency, "currency", {
            defaultValue: "INR"
        }),
        status: sanitizeString(req.body.status, "status", {
            defaultValue: "INITIATED"
        }),
        metadataJson: req.body
    });

    res.status(202).json({ received: true, transaction });
}

async function listOrderPayments(req, res) {
    const order = await requirePaymentOrder(req.params.orderId, req.user.id);
    const transactions = await listPaymentTransactionsByOrder(order.id);

    res.status(200).json({ transactions });
}

module.exports = {
    authorizePayment,
    capturePayment,
    initiatePayment,
    listOrderPayments,
    providerWebhook,
    refundPayment
};
