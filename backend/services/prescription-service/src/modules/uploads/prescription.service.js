const createError = require("http-errors");
const { PrescriptionModel } = require("./prescription.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class PrescriptionService {
  constructor({ prescriptionModel = new PrescriptionModel() } = {}) {
    this.prescriptionModel = prescriptionModel;
  }

  async upload(input) {
    try {
      return await this.prescriptionModel.create(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async get(id) {
    const prescription = await this.prescriptionModel.findById(id);
    if (!prescription) throw createError(404, "Prescription not found");
    return prescription;
  }

  async list(filters = {}) {
    return this.prescriptionModel.list({
      customerId: filters.customerId,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async updateOcr(id, input) {
    const prescription = await this.prescriptionModel.updateOcr(id, input);
    if (!prescription) throw createError(404, "Prescription not found");
    return prescription;
  }

  async markUnderReview(id, input) {
    return this.setStatus(id, {
      status: "UNDER_REVIEW",
      reviewedByUserId: input.reviewedByUserId,
    });
  }

  async approve(id, input) {
    return this.setStatus(id, {
      status: "APPROVED",
      reviewedByUserId: input.reviewedByUserId,
    });
  }

  async reject(id, input) {
    return this.setStatus(id, {
      status: "REJECTED",
      reviewedByUserId: input.reviewedByUserId,
      rejectionReason: input.reason,
    });
  }

  async flag(id, input) {
    return this.setStatus(id, {
      status: "FLAGGED",
      reviewedByUserId: input.reviewedByUserId,
      rejectionReason: input.reason,
      fraudFlags: input.fraudFlags,
    });
  }

  async setStatus(id, input) {
    const prescription = await this.prescriptionModel.updateStatus(id, input);
    if (!prescription) throw createError(404, "Prescription not found");
    return prescription;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced customer or order does not exist");
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Prescription data violates database constraints");
    }
  }
}

module.exports = {
  PrescriptionService,
};
