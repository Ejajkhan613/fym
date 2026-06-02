const { getPool } = require("../db");
const { findAddressByIdForUser } = require("../models/address.model");
const { listAuditLogsForEntity } = require("../models/audit-log.model");
const { listCartItems, clearCart } = require("../models/cart.model");
const { findDeliveryAssignmentByOrder } = require("../models/delivery.model");
const { findMedicineById } = require("../models/medicine.model");
const {
    acceptOrderForPharmacy,
    createOrder,
    findOrderById,
    listOrders,
    listOrdersByCustomer,
    listOrdersByPharmacy,
    updateOrder,
    updateOrderStatus
} = require("../models/order.model");
const {
    createOrderItem,
    findOrderItemById,
    listOrderItems,
    updateOrderItemStatus
} = require("../models/order-item.model");
const { findPrimaryPharmacyByOwner } = require("../models/pharmacy.model");
const {
    createVendorOrderOffer,
    findVendorOrderOffer,
    listOffersForOrder,
    listOffersForPharmacy,
    rejectVendorOrderOffer
} = require("../models/vendor-order-offer.model");
const {
    assertOwned,
    createHttpError,
    parsePagination,
    sanitizeInteger,
    sanitizeNumber,
    sanitizeString
} = require("./controller-utils");

async function orderWithItems(order) {
    if (!order) {
        return null;
    }

    return {
        ...order,
        items: await listOrderItems(order.id)
    };
}

async function requireCustomerOrder(orderId, userId) {
    const order = await findOrderById(orderId);
    assertOwned(order, userId, "customer_id", "ORDER_NOT_FOUND", "Order not found");
    return order;
}

async function requireVendorPharmacy(userId) {
    const pharmacy = await findPrimaryPharmacyByOwner(userId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    return pharmacy;
}

async function requireVendorOrder(orderId, userId) {
    const pharmacy = await requireVendorPharmacy(userId);
    const order = await findOrderById(orderId);

    if (!order || order.pharmacy_id !== pharmacy.id) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    return { pharmacy, order };
}

function summarizeItems(items) {
    return items.reduce(
        (summary, item) => {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice || item.unit_price || 0);
            summary.subtotal += quantity * unitPrice;
            summary.hasPrescription = summary.hasPrescription || Boolean(
                item.requiresPrescription || item.requires_prescription
            );
            return summary;
        },
        { subtotal: 0, hasPrescription: false }
    );
}

async function normalizeOrderItems(bodyItems, userId) {
    const sourceItems = Array.isArray(bodyItems) ? bodyItems : await listCartItems(userId);

    if (!sourceItems || sourceItems.length === 0) {
        throw createHttpError(400, "ORDER_ITEMS_REQUIRED", "Order items are required");
    }

    const items = [];

    for (const item of sourceItems) {
        const medicineId = item.medicineId || item.medicine_id || null;
        const quantity = sanitizeInteger(item.quantity, "quantity", {
            min: 1,
            defaultValue: 1
        });
        const unitPrice = sanitizeNumber(item.unitPrice || item.unit_price, "unitPrice", {
            min: 0,
            defaultValue: 0
        });
        let requestedName = sanitizeString(
            item.requestedName || item.requested_name,
            "requestedName"
        );
        let requiresPrescription = Boolean(
            item.requiresPrescription || item.requires_prescription
        );

        if (medicineId) {
            const medicine = await findMedicineById(medicineId);

            if (!medicine) {
                throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
            }

            requestedName = requestedName || medicine.brand_name;
            requiresPrescription =
                requiresPrescription || medicine.requires_prescription;
        }

        if (!requestedName) {
            throw createHttpError(
                400,
                "REQUESTED_NAME_REQUIRED",
                "requestedName is required"
            );
        }

        items.push({
            medicineId,
            requestedName,
            quantity,
            unitPrice,
            requiresPrescription
        });
    }

    return items;
}

async function listMyOrders(req, res) {
    const orders = await listOrdersByCustomer(req.user.id, parsePagination(req.query));
    res.status(200).json({ orders });
}

async function createMyOrder(req, res) {
    const deliveryAddressId = sanitizeString(
        req.body.deliveryAddressId,
        "deliveryAddressId",
        { required: true }
    );
    const address = await findAddressByIdForUser(deliveryAddressId, req.user.id);

    if (!address) {
        throw createHttpError(404, "ADDRESS_NOT_FOUND", "Address not found");
    }

    const items = await normalizeOrderItems(req.body.items, req.user.id);
    const summary = summarizeItems(items);
    const deliveryFee = sanitizeNumber(req.body.deliveryFee, "deliveryFee", {
        min: 0,
        defaultValue: 0
    });
    const platformFee = sanitizeNumber(req.body.platformFee, "platformFee", {
        min: 0,
        defaultValue: 0
    });
    const discount = sanitizeNumber(req.body.discount, "discount", {
        min: 0,
        defaultValue: 0
    });
    const totalAmount = Math.max(
        summary.subtotal + deliveryFee + platformFee - discount,
        0
    );

    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const orderResult = await client.query(
            `
                INSERT INTO orders (
                    customer_id,
                    prescription_id,
                    status,
                    order_type,
                    subtotal,
                    delivery_fee,
                    platform_fee,
                    discount,
                    total_amount,
                    payment_status,
                    delivery_address_id
                )
                VALUES ($1, $2, 'VENDOR_MATCHING', $3, $4, $5, $6, $7, $8, 'PAYMENT_PENDING', $9)
                RETURNING *
            `,
            [
                req.user.id,
                req.body.prescriptionId || null,
                summary.hasPrescription ? "PRESCRIPTION" : "OTC",
                summary.subtotal,
                deliveryFee,
                platformFee,
                discount,
                totalAmount,
                deliveryAddressId
            ]
        );
        const order = orderResult.rows[0];

        for (const item of items) {
            await client.query(
                `
                    INSERT INTO order_items (
                        order_id,
                        medicine_id,
                        requested_name,
                        quantity,
                        unit_price,
                        requires_prescription
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                `,
                [
                    order.id,
                    item.medicineId,
                    item.requestedName,
                    item.quantity,
                    item.unitPrice,
                    item.requiresPrescription
                ]
            );
        }

        if (!Array.isArray(req.body.items)) {
            await client.query("DELETE FROM cart_items WHERE user_id = $1", [req.user.id]);
        }

        await client.query("COMMIT");
        res.status(201).json({ order: await orderWithItems(order) });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getMyOrder(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);
    res.status(200).json({ order: await orderWithItems(order) });
}

async function cancelMyOrder(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);

    if (["DELIVERED", "CANCELLED_BY_USER", "CANCELLED_BY_VENDOR"].includes(order.status)) {
        throw createHttpError(409, "ORDER_NOT_CANCELLABLE", "Order cannot be cancelled");
    }

    const updatedOrder = await updateOrderStatus(order.id, "CANCELLED_BY_USER");
    res.status(200).json({ order: updatedOrder });
}

async function getOrderTracking(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);
    const delivery = await findDeliveryAssignmentByOrder(order.id);

    res.status(200).json({ order, delivery });
}

async function getOrderTimeline(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);
    const auditLogs = await listAuditLogsForEntity("ORDER", order.id, {
        limit: 100,
        offset: 0
    });

    res.status(200).json({ order, auditLogs });
}

async function getOrderInvoice(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);
    res.status(200).json({ invoice: await orderWithItems(order) });
}

async function approveSubstitution(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);
    const item = await findOrderItemById(req.params.substitutionId);

    if (!item || item.order_id !== order.id) {
        throw createHttpError(404, "ORDER_ITEM_NOT_FOUND", "Order item not found");
    }

    const updatedItem = await updateOrderItemStatus(item.id, "SUBSTITUTED");
    res.status(200).json({ item: updatedItem });
}

async function rejectSubstitution(req, res) {
    const order = await requireCustomerOrder(req.params.orderId, req.user.id);
    const item = await findOrderItemById(req.params.substitutionId);

    if (!item || item.order_id !== order.id) {
        throw createHttpError(404, "ORDER_ITEM_NOT_FOUND", "Order item not found");
    }

    const updatedItem = await updateOrderItemStatus(item.id, "CANCELLED");
    res.status(200).json({ item: updatedItem });
}

async function listVendorOrders(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const orders = await listOrdersByPharmacy(pharmacy.id, parsePagination(req.query));
    res.status(200).json({ orders });
}

async function listVendorOrderOffers(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const offers = await listOffersForPharmacy(pharmacy.id, {
        status: sanitizeString(req.query.status, "status"),
        ...parsePagination(req.query)
    });
    res.status(200).json({ offers });
}

async function getVendorOrder(req, res) {
    const { order } = await requireVendorOrder(req.params.orderId, req.user.id);
    res.status(200).json({ order: await orderWithItems(order) });
}

async function acceptVendorOrder(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const offer = await findVendorOrderOffer({
        orderId: req.params.orderId,
        pharmacyId: pharmacy.id
    });

    if (!offer) {
        throw createHttpError(404, "OFFER_NOT_FOUND", "Vendor offer not found");
    }

    const order = await acceptOrderForPharmacy(req.params.orderId, pharmacy.id);

    if (!order) {
        throw createHttpError(409, "ORDER_ALREADY_ASSIGNED", "Order is already assigned");
    }

    res.status(200).json({ order });
}

async function rejectVendorOrder(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const offer = await findVendorOrderOffer({
        orderId: req.params.orderId,
        pharmacyId: pharmacy.id
    });

    if (!offer) {
        throw createHttpError(404, "OFFER_NOT_FOUND", "Vendor offer not found");
    }

    const updatedOffer = await rejectVendorOrderOffer(
        offer.id,
        sanitizeString(req.body.rejectionReason, "rejectionReason")
    );
    res.status(200).json({ offer: updatedOffer });
}

async function cancelVendorOrder(req, res) {
    const { order } = await requireVendorOrder(req.params.orderId, req.user.id);
    const updatedOrder = await updateOrderStatus(order.id, "CANCELLED_BY_VENDOR");
    res.status(200).json({ order: updatedOrder });
}

async function suggestSubstitute(req, res) {
    const { order } = await requireVendorOrder(req.params.orderId, req.user.id);
    const orderItemId = sanitizeString(req.body.orderItemId, "orderItemId", {
        required: true
    });
    const originalItem = await findOrderItemById(orderItemId);

    if (!originalItem || originalItem.order_id !== order.id) {
        throw createHttpError(404, "ORDER_ITEM_NOT_FOUND", "Order item not found");
    }

    const substituteItem = await createOrderItem({
        orderId: order.id,
        medicineId: sanitizeString(req.body.medicineId, "medicineId"),
        requestedName: sanitizeString(req.body.requestedName, "requestedName", {
            required: true
        }),
        quantity: sanitizeInteger(req.body.quantity, "quantity", {
            min: 1,
            defaultValue: originalItem.quantity
        }),
        unitPrice: sanitizeNumber(req.body.unitPrice, "unitPrice", {
            min: 0,
            defaultValue: originalItem.unit_price
        }),
        substitutionOfItemId: originalItem.id,
        requiresPrescription: originalItem.requires_prescription,
        status: "SUBSTITUTION_REQUESTED"
    });

    await updateOrderItemStatus(originalItem.id, "SUBSTITUTION_REQUESTED");
    res.status(201).json({ item: substituteItem });
}

async function markVendorOrderPacked(req, res) {
    const { order } = await requireVendorOrder(req.params.orderId, req.user.id);
    const updatedOrder = await updateOrderStatus(order.id, "PACKED");
    res.status(200).json({ order: updatedOrder });
}

async function listAdminOrders(req, res) {
    const orders = await listOrders({
        status: sanitizeString(req.query.status, "status"),
        customerId: sanitizeString(req.query.customerId, "customerId"),
        pharmacyId: sanitizeString(req.query.pharmacyId, "pharmacyId"),
        ...parsePagination(req.query)
    });
    res.status(200).json({ orders });
}

async function getAdminOrder(req, res) {
    const order = await findOrderById(req.params.orderId);

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    res.status(200).json({ order: await orderWithItems(order) });
}

async function forceAssignVendor(req, res) {
    const pharmacyId = sanitizeString(req.body.pharmacyId, "pharmacyId", {
        required: true
    });
    const order = await updateOrder(req.params.orderId, {
        pharmacyId,
        status: "VENDOR_ACCEPTED",
        acceptedAt: new Date()
    });

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    await createVendorOrderOffer({
        orderId: order.id,
        pharmacyId,
        status: "OFFER_ACCEPTED",
        respondedAt: new Date()
    }).catch(() => null);

    res.status(200).json({ order });
}

async function cancelAdminOrder(req, res) {
    const order = await updateOrderStatus(req.params.orderId, "CANCELLED_BY_ADMIN");

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    res.status(200).json({ order });
}

async function refundAdminOrder(req, res) {
    const order = await updateOrder(req.params.orderId, {
        paymentStatus: "REFUND_INITIATED",
        status: "REFUNDED"
    });

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    res.status(200).json({ order });
}

async function getAdminOrderTimeline(req, res) {
    const order = await findOrderById(req.params.orderId);

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    const auditLogs = await listAuditLogsForEntity("ORDER", order.id, {
        limit: 100,
        offset: 0
    });
    res.status(200).json({ order, auditLogs });
}

async function listAdminOrderVendorResponses(req, res) {
    const offers = await listOffersForOrder(req.params.orderId);
    res.status(200).json({ offers });
}

async function getAdminOrderTracking(req, res) {
    const order = await findOrderById(req.params.orderId);

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    res.status(200).json({
        order,
        delivery: await findDeliveryAssignmentByOrder(order.id)
    });
}

async function getAdminOrderInvoice(req, res) {
    const order = await findOrderById(req.params.orderId);

    if (!order) {
        throw createHttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    res.status(200).json({ invoice: await orderWithItems(order) });
}

module.exports = {
    acceptVendorOrder,
    approveSubstitution,
    cancelAdminOrder,
    cancelMyOrder,
    cancelVendorOrder,
    createMyOrder,
    forceAssignVendor,
    getAdminOrder,
    getAdminOrderInvoice,
    getAdminOrderTimeline,
    getAdminOrderTracking,
    getMyOrder,
    getOrderInvoice,
    getOrderTimeline,
    getOrderTracking,
    getVendorOrder,
    listAdminOrderVendorResponses,
    listAdminOrders,
    listMyOrders,
    listVendorOrderOffers,
    listVendorOrders,
    markVendorOrderPacked,
    refundAdminOrder,
    rejectSubstitution,
    rejectVendorOrder,
    suggestSubstitute
};
