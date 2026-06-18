const createError = require("http-errors");
const { PrescriptionModel } = require("./prescription.model");
const { PrescriptionFileStorage } = require("./prescription.storage");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class PrescriptionService {
  constructor({
    prescriptionModel = new PrescriptionModel(),
    fileStorage = new PrescriptionFileStorage(),
  } = {}) {
    this.prescriptionModel = prescriptionModel;
    this.fileStorage = fileStorage;
  }

  async upload(input) {
    try {
      return await this.prescriptionModel.create(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async uploadFile(input) {
    const { fileUrl } = await this.fileStorage.uploadPrescriptionFile({
      customerId: input.customerId,
      file: input.file,
    });

    return this.upload({
      customerId: input.customerId,
      orderId: input.orderId,
      fileUrl,
      fileType: input.fileType,
    });
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

  async linkToOrder(id, input) {
    try {
      const prescription = await this.prescriptionModel.linkToOrder(
        id,
        input.orderId,
      );
      if (!prescription) throw createError(404, "Prescription not found");
      return prescription;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async delete(id) {
    const prescription = await this.prescriptionModel.deleteById(id);
    if (!prescription) throw createError(404, "Prescription not found");

    try {
      await this.fileStorage.deletePrescriptionFile({
        fileUrl: prescription.fileUrl,
      });
    } catch {
      // Deleting the vault record should still succeed if the storage object
      // was already removed or belongs to a non-managed URL.
    }

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
