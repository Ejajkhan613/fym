const createError = require("http-errors");
const { PenaltyModel } = require("./penalty.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

function calculatePenaltyAmount(input) {
  const baseAmount = input.baseAmount ?? 0;
  const customerInconvenienceFee = input.customerInconvenienceFee ?? 0;
  const deliveryLossFee = input.deliveryLossFee ?? 0;
  const platformSlaFee = input.platformSlaFee ?? 0;
  const repeatMultiplier = input.repeatMultiplier ?? 1;

  return Number(
    (
      (baseAmount +
        customerInconvenienceFee +
        deliveryLossFee +
        platformSlaFee) *
      repeatMultiplier
    ).toFixed(2),
  );
}

class PenaltyService {
  constructor({ penaltyModel = new PenaltyModel() } = {}) {
    this.penaltyModel = penaltyModel;
  }

  async create(input) {
    const amount = calculatePenaltyAmount(input);

    try {
      return await this.penaltyModel.create({
        ...input,
        level: input.level ?? 1,
        baseAmount: input.baseAmount ?? 0,
        customerInconvenienceFee: input.customerInconvenienceFee ?? 0,
        deliveryLossFee: input.deliveryLossFee ?? 0,
        platformSlaFee: input.platformSlaFee ?? 0,
        repeatMultiplier: input.repeatMultiplier ?? 1,
        amount,
      });
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async get(id) {
    const penalty = await this.penaltyModel.findById(id);
    if (!penalty) throw createError(404, "Penalty not found");
    return penalty;
  }

  async list(filters = {}) {
    return this.penaltyModel.list({
      pharmacyId: filters.pharmacyId,
      orderId: filters.orderId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async waive(id, input) {
    await this.get(id);
    return this.penaltyModel.updateStatus(id, {
      status: "waived",
      metadata: { waivedByUserId: input.actorUserId, reason: input.reason },
    });
  }

  async markPaid(id) {
    await this.get(id);
    return this.penaltyModel.updateStatus(id, { status: "paid" });
  }

  async appeal(id, input) {
    const penalty = await this.get(id);

    if (!["applied", "disputed"].includes(penalty.status)) {
      throw createError(
        409,
        `Penalty status ${penalty.status} cannot be appealed`,
      );
    }

    return this.penaltyModel.createAppeal(penalty, input);
  }

  async listAppeals(filters = {}) {
    return this.penaltyModel.listAppeals({
      penaltyId: filters.penaltyId,
      pharmacyId: filters.pharmacyId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async reviewAppeal(id, input) {
    const appeal = await this.penaltyModel.reviewAppeal(id, input);
    if (!appeal) throw createError(404, "Penalty appeal not found");
    return appeal;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(
        400,
        "Referenced pharmacy, order, user, or penalty does not exist",
      );
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Penalty data violates database constraints");
    }
  }
}

module.exports = {
  PenaltyService,
  calculatePenaltyAmount,
};
