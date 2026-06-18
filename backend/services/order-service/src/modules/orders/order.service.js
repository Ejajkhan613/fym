const createError = require("http-errors");
const { OrderModel } = require("./order.model");
const { RealtimePublisher } = require("./realtime.publisher");
const { orderEvents } = require("./order.constants");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

function publishEvents(publisher, events = []) {
  for (const event of events) {
    publisher.publish(event);
  }
}

class OrderService {
  constructor({
    orderModel = new OrderModel(),
    realtimePublisher = new RealtimePublisher(),
    candidateLimit = 5,
    offerTtlSeconds = Number(process.env.ORDER_OFFER_TTL_SECONDS || 45),
  } = {}) {
    this.orderModel = orderModel;
    this.realtimePublisher = realtimePublisher;
    this.candidateLimit = candidateLimit;
    this.offerTtlSeconds = offerTtlSeconds;
  }

  async createOrder(input) {
    const items = input.items.map((item) => ({
      ...item,
      lineTotal: Number((item.quantity * item.unitPrice).toFixed(2)),
    }));

    const subtotal = Number(
      items.reduce((total, item) => total + item.lineTotal, 0).toFixed(2),
    );
    const deliveryFee = input.deliveryFee ?? 0;
    const platformFee = input.platformFee ?? 0;
    const discount = input.discount ?? 0;
    const totalAmount = Number(
      (subtotal + deliveryFee + platformFee - discount).toFixed(2),
    );

    const candidatePharmacyIds =
      input.candidatePharmacyIds?.length > 0
        ? input.candidatePharmacyIds
        : await this.orderModel.findApprovedCandidatePharmacies({
            city: input.deliveryAddress.city,
            limit: this.candidateLimit,
          });

    if (candidatePharmacyIds.length === 0) {
      throw createError(
        409,
        "No pharmacies are available right now",
      );
    }

    try {
      const result = await this.orderModel.createOrder(
        {
          customerId: input.customerId,
          orderType: input.orderType || this.resolveOrderType(items),
          paymentStatus: input.paymentStatus || "PAYMENT_PENDING",
          subtotal,
          deliveryFee,
          platformFee,
          discount,
          totalAmount,
          deliveryAddress: input.deliveryAddress,
          prescriptionId: input.prescriptionId,
          items,
          candidatePharmacyIds,
        },
        {
          offerExpiresAt: new Date(Date.now() + this.offerTtlSeconds * 1000),
        },
      );

      publishEvents(this.realtimePublisher, result.realtimeEvents);
      return result;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getOrder(id) {
    const order = await this.orderModel.getOrderDetails(id);

    if (!order) {
      throw createError(404, "Order not found");
    }

    return order;
  }

  async listOrders(filters = {}) {
    return this.orderModel.listOrders({
      customerId: filters.customerId,
      pharmacyId: filters.pharmacyId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async getTimeline(id) {
    await this.assertOrderExists(id);
    return this.orderModel.listOrderTimeline(id);
  }

  async cancelByCustomer(id, input) {
    const order = await this.assertOrderExists(id);

    if (
      ![
        "CREATED",
        "PAYMENT_PENDING",
        "VENDOR_MATCHING",
        "VENDOR_OFFERED",
        "VENDOR_ACCEPTED",
      ].includes(order.status)
    ) {
      throw createError(
        409,
        `Order status ${order.status} cannot be cancelled by user`,
      );
    }

    const result = await this.orderModel.updateOrderStatus(id, {
      toStatus: "CANCELLED_BY_USER",
      actorType: "customer",
      actorId: order.customerId,
      reason: input.reason || "Cancelled by customer",
      eventName: orderEvents.ORDER_CANCELLED,
    });

    publishEvents(this.realtimePublisher, result.realtimeEvents);
    return result.order;
  }

  async listPharmacyOffers(filters) {
    const expired = await this.orderModel.expirePharmacyOffers(
      filters.pharmacyId,
    );

    publishEvents(this.realtimePublisher, expired.realtimeEvents);

    return this.orderModel.listPharmacyOffers({
      pharmacyId: filters.pharmacyId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async getPharmacyOrder(orderId, pharmacyId) {
    const details = await this.getOrder(orderId);
    const hasOffer = details.offers.some(
      (offer) => offer.pharmacyId === pharmacyId,
    );

    if (details.order.pharmacyId !== pharmacyId && !hasOffer) {
      throw createError(403, "Order is not visible to this pharmacy");
    }

    return details;
  }

  async viewOffer(orderId, pharmacyId) {
    const result = await this.orderModel.markOfferViewed(orderId, pharmacyId);

    if (!result) {
      throw createError(404, "Order offer not found");
    }

    publishEvents(this.realtimePublisher, result.realtimeEvents);

    return result.offer;
  }

  async acceptOffer(orderId, input) {
    this.assertAcceptanceChecklist(input);

    try {
      const result = await this.orderModel.acceptOffer(
        orderId,
        input.pharmacyId,
        input,
      );

      if (result.outcome === "OFFER_NOT_FOUND") {
        throw createError(404, "Order offer not found");
      }

      if (result.outcome === "OFFER_EXPIRED") {
        publishEvents(this.realtimePublisher, result.realtimeEvents);
        throw createError(409, "Order offer has expired");
      }

      if (result.outcome === "OFFER_NOT_ACCEPTABLE") {
        throw createError(409, "Order offer is no longer acceptable");
      }

      if (result.outcome === "ORDER_ALREADY_ASSIGNED") {
        publishEvents(this.realtimePublisher, result.realtimeEvents);
        throw createError(409, "Order is already assigned to another pharmacy");
      }

      publishEvents(this.realtimePublisher, result.realtimeEvents);
      return {
        order: result.order,
        offer: result.offer,
      };
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async rejectOffer(orderId, input) {
    const result = await this.orderModel.rejectOffer(
      orderId,
      input.pharmacyId,
      input.reason,
    );

    if (!result) {
      throw createError(404, "Order offer not found");
    }

    publishEvents(this.realtimePublisher, result.realtimeEvents);

    return result.offer;
  }

  async markPacking(orderId, input) {
    const order = await this.assertOrderAssignedToPharmacy(
      orderId,
      input.pharmacyId,
    );

    if (!["VENDOR_ACCEPTED", "PHARMACIST_APPROVED"].includes(order.status)) {
      throw createError(
        409,
        `Order status ${order.status} cannot move to packing`,
      );
    }

    const result = await this.orderModel.updateOrderStatus(orderId, {
      toStatus: "PACKING",
      actorType: "pharmacy",
      actorId: input.pharmacyId,
      reason: input.reason || "Pharmacy started packing",
      eventName: orderEvents.ORDER_PACKING,
    });

    publishEvents(this.realtimePublisher, result.realtimeEvents);
    return result.order;
  }

  async markPacked(orderId, input) {
    const order = await this.assertOrderAssignedToPharmacy(
      orderId,
      input.pharmacyId,
    );

    if (
      !["VENDOR_ACCEPTED", "PHARMACIST_APPROVED", "PACKING"].includes(
        order.status,
      )
    ) {
      throw createError(409, `Order status ${order.status} cannot be packed`);
    }

    const result = await this.orderModel.updateOrderStatus(orderId, {
      toStatus: "PACKED",
      actorType: "pharmacy",
      actorId: input.pharmacyId,
      reason: input.reason || "Order packed by pharmacy",
      eventName: orderEvents.ORDER_PACKED,
    });

    publishEvents(this.realtimePublisher, result.realtimeEvents);
    return result.order;
  }

  async cancelByPharmacy(orderId, input) {
    const order = await this.assertOrderAssignedToPharmacy(
      orderId,
      input.pharmacyId,
    );

    if (
      ["PACKED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
        order.status,
      )
    ) {
      throw createError(
        409,
        `Order status ${order.status} cannot be cancelled by pharmacy`,
      );
    }

    const result = await this.orderModel.updateOrderStatus(orderId, {
      toStatus: "CANCELLED_BY_VENDOR",
      actorType: "pharmacy",
      actorId: input.pharmacyId,
      reason: input.reason,
      eventName: orderEvents.ORDER_CANCELLED,
    });

    publishEvents(this.realtimePublisher, result.realtimeEvents);
    return result.order;
  }

  resolveOrderType(items) {
    const prescriptionCount = items.filter(
      (item) => item.requiresPrescription,
    ).length;

    if (prescriptionCount === 0) {
      return "OTC";
    }

    if (prescriptionCount === items.length) {
      return "PRESCRIPTION";
    }

    return "MIXED";
  }

  assertAcceptanceChecklist(input) {
    if (!input.stockConfirmed) {
      throw createError(400, "Stock confirmation is required");
    }

    if (!input.expiryConfirmed) {
      throw createError(400, "Expiry confirmation is required");
    }

    if (!input.pharmacistVerified) {
      throw createError(400, "Pharmacist verification is required");
    }
  }

  async assertOrderExists(id) {
    const order = await this.orderModel.findOrderById(id);

    if (!order) {
      throw createError(404, "Order not found");
    }

    return order;
  }

  async assertOrderAssignedToPharmacy(orderId, pharmacyId) {
    const order = await this.assertOrderExists(orderId);

    if (order.pharmacyId !== pharmacyId) {
      throw createError(403, "Order is not assigned to this pharmacy");
    }

    return order;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(
        400,
        "Referenced customer, pharmacy, medicine, or order does not exist",
      );
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Order data violates database constraints");
    }
  }
}

module.exports = {
  OrderService,
};
