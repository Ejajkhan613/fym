const {
    findDeliveryAssignmentByOrder,
    findRiderById,
    listDeliveryAssignments,
    listRiders,
    updateDeliveryAssignmentByOrder,
    updateRiderLocation,
    upsertDeliveryAssignment
} = require("../models/delivery.model");
const { findOrderById, updateOrderStatus } = require("../models/order.model");
const {
    createHttpError,
    parsePagination,
    sanitizeNumber,
    sanitizeString
} = require("./controller-utils");

async function requireOrder(orderId) {
    const order = await findOrderById(orderId);

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    return order;
}

async function getDeliveryOrder(req, res) {
    const order = await requireOrder(req.params.orderId);
    const delivery = await findDeliveryAssignmentByOrder(order.id);

    res.status(200).json({ order, delivery });
}

async function assignRider(req, res) {
    const order = await requireOrder(req.params.orderId);
    const riderId = sanitizeString(req.body.riderId, "riderId", { required: true });
    const rider = await findRiderById(riderId);

    if (!rider) {
        throw createHttpError(404, "RIDER_NOT_FOUND", "Rider not found");
    }

    const delivery = await upsertDeliveryAssignment({
        orderId: order.id,
        riderId,
        status: "ASSIGNED"
    });
    const updatedOrder = await updateOrderStatus(order.id, "RIDER_ASSIGNED");

    res.status(200).json({ order: updatedOrder, delivery });
}

async function markPickedUp(req, res) {
    const order = await requireOrder(req.params.orderId);
    const delivery = await updateDeliveryAssignmentByOrder(order.id, {
        status: "PICKED_UP",
        picked_up_at: new Date()
    });
    const updatedOrder = await updateOrderStatus(order.id, "PICKED_UP");

    res.status(200).json({ order: updatedOrder, delivery });
}

async function markDelivered(req, res) {
    const order = await requireOrder(req.params.orderId);
    const delivery = await updateDeliveryAssignmentByOrder(order.id, {
        status: "DELIVERED",
        delivered_at: new Date(),
        proof_url: sanitizeString(req.body.proofUrl, "proofUrl")
    });
    const updatedOrder = await updateOrderStatus(order.id, "DELIVERED");

    res.status(200).json({ order: updatedOrder, delivery });
}

async function markFailedAttempt(req, res) {
    const order = await requireOrder(req.params.orderId);
    const delivery = await updateDeliveryAssignmentByOrder(order.id, {
        status: "FAILED",
        failed_at: new Date(),
        failure_reason: sanitizeString(req.body.failureReason, "failureReason", {
            required: true
        })
    });
    const updatedOrder = await updateOrderStatus(order.id, "FAILED_DELIVERY");

    res.status(200).json({ order: updatedOrder, delivery });
}

async function uploadProof(req, res) {
    const order = await requireOrder(req.params.orderId);
    const delivery = await updateDeliveryAssignmentByOrder(order.id, {
        proof_url: sanitizeString(req.body.proofUrl, "proofUrl", { required: true })
    });

    res.status(200).json({ delivery });
}

async function updateRiderGps(req, res) {
    const rider = await updateRiderLocation(req.params.riderId, {
        latitude: sanitizeNumber(req.body.latitude, "latitude", {
            required: true,
            min: -90,
            max: 90
        }),
        longitude: sanitizeNumber(req.body.longitude, "longitude", {
            required: true,
            min: -180,
            max: 180
        })
    });

    if (!rider) {
        throw createHttpError(404, "RIDER_NOT_FOUND", "Rider not found");
    }

    res.status(200).json({ rider });
}

async function listAdminDeliveryOrders(req, res) {
    const deliveryOrders = await listDeliveryAssignments({
        status: sanitizeString(req.query.status, "status"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ deliveryOrders });
}

async function listAdminRiders(req, res) {
    const riders = await listRiders({
        status: sanitizeString(req.query.status, "status"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ riders });
}

async function getAdminRider(req, res) {
    const rider = await findRiderById(req.params.riderId);

    if (!rider) {
        throw createHttpError(404, "RIDER_NOT_FOUND", "Rider not found");
    }

    res.status(200).json({ rider });
}

async function getAdminDeliveryProof(req, res) {
    const delivery = await findDeliveryAssignmentByOrder(req.params.orderId);

    if (!delivery) {
        throw createHttpError(404, "DELIVERY_NOT_FOUND", "Delivery not found");
    }

    res.status(200).json({
        proofUrl: delivery.proof_url,
        delivery
    });
}

module.exports = {
    assignRider,
    getAdminDeliveryProof,
    getAdminRider,
    getDeliveryOrder,
    listAdminDeliveryOrders,
    listAdminRiders,
    markDelivered,
    markFailedAttempt,
    markPickedUp,
    updateRiderGps,
    uploadProof
};
