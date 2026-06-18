const createError = require("http-errors");
const { PaymentModel } = require("./payment.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class PaymentService {
  constructor({ paymentModel = new PaymentModel() } = {}) {
    this.paymentModel = paymentModel;
  }

  async initiate(input) {
    try {
      return await this.paymentModel.initiate(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async get(id) {
    const payment = await this.paymentModel.findById(id);
    if (!payment) throw createError(404, "Payment transaction not found");
    return payment;
  }

  async listForOrder(orderId) {
    return this.paymentModel.listForOrder(orderId);
  }

  async listForCustomer(customerId) {
    return this.paymentModel.listForCustomer(customerId);
  }

  async authorize(id, input) {
    return this.setStatus(id, {
      status: "PAYMENT_AUTHORIZED",
      providerReference: input.providerReference,
      metadata: input.metadata,
    });
  }

  async capture(id, input) {
    return this.setStatus(id, {
      status: "PAYMENT_CAPTURED",
      providerReference: input.providerReference,
      metadata: input.metadata,
    });
  }

  async fail(id, input) {
    return this.setStatus(id, {
      status: "PAYMENT_FAILED",
      providerReference: input.providerReference,
      metadata: { failureReason: input.reason, ...(input.metadata || {}) },
    });
  }

  async setStatus(id, input) {
    const payment = await this.paymentModel.updateStatus(id, input);
    if (!payment) throw createError(404, "Payment transaction not found");
    return payment;
  }

  async createRefund(paymentTransactionId, input) {
    const payment = await this.get(paymentTransactionId);

    if (!["PAYMENT_AUTHORIZED", "PAYMENT_CAPTURED"].includes(payment.status)) {
      throw createError(
        409,
        `Payment status ${payment.status} cannot be refunded`,
      );
    }

    if (input.amount > payment.amount) {
      throw createError(400, "Refund amount cannot exceed payment amount");
    }

    return this.paymentModel.createRefund({
      paymentTransactionId,
      orderId: payment.orderId,
      amount: input.amount,
      reason: input.reason,
      providerReference: input.providerReference,
    });
  }

  async updateRefundStatus(id, input) {
    const refund = await this.paymentModel.updateRefundStatus(id, input);
    if (!refund) throw createError(404, "Refund not found");
    return refund;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced order or customer does not exist");
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Payment data violates database constraints");
    }
  }
}

module.exports = {
  PaymentService,
};
