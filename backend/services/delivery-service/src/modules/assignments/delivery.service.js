const createError = require("http-errors");
const { DeliveryModel } = require("./delivery.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class DeliveryService {
  constructor({ deliveryModel = new DeliveryModel() } = {}) {
    this.deliveryModel = deliveryModel;
  }

  async assign(input) {
    try {
      const assignment = await this.deliveryModel.assign(input);
      if (!assignment) throw createError(404, "Order not found");
      return assignment;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async get(id) {
    const assignment = await this.deliveryModel.findById(id);
    if (!assignment) throw createError(404, "Delivery assignment not found");
    return assignment;
  }

  async list(filters = {}) {
    return this.deliveryModel.list({
      riderUserId: filters.riderUserId,
      orderId: filters.orderId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async markPickedUp(id, input = {}) {
    const assignment = await this.get(id);
    this.assertOtpMatches(
      assignment.pickupOtp,
      input.pickupOtp,
      "Invalid pickup OTP",
    );
    return this.updateStatus(id, {
      status: "PICKED_UP",
      riderUserId: input.riderUserId,
    });
  }

  async markOutForDelivery(id, input = {}) {
    return this.updateStatus(id, {
      status: "OUT_FOR_DELIVERY",
      riderUserId: input.riderUserId,
    });
  }

  async failDelivery(id, input) {
    return this.updateStatus(id, {
      status: "FAILED",
      reason: input.reason,
      riderUserId: input.riderUserId,
    });
  }

  async updateStatus(id, input) {
    const assignment = await this.deliveryModel.updateStatus(id, input);
    if (!assignment) throw createError(404, "Delivery assignment not found");
    return assignment;
  }

  async addTrackingEvent(id, input) {
    await this.get(id);
    return this.deliveryModel.addTrackingEvent(id, input);
  }

  async listTrackingEvents(id) {
    await this.get(id);
    return this.deliveryModel.listTrackingEvents(id);
  }

  async createProofOfDelivery(id, input) {
    const assignment = await this.get(id);

    if (assignment.status === "DELIVERED") {
      throw createError(409, "Delivery is already completed");
    }

    this.assertOtpMatches(
      assignment.deliveryOtp,
      input.deliveryOtp,
      "Invalid delivery OTP",
    );

    return this.deliveryModel.createProofOfDelivery(id, {
      ...input,
      otpVerified: Boolean(input.deliveryOtp) || input.otpVerified,
    });
  }

  assertOtpMatches(expectedOtp, providedOtp, message) {
    if (!providedOtp) return;
    if (expectedOtp !== providedOtp) throw createError(400, message);
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(
        400,
        "Referenced order, rider, or pharmacy does not exist",
      );
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Delivery data violates database constraints");
    }
  }
}

module.exports = {
  DeliveryService,
};
