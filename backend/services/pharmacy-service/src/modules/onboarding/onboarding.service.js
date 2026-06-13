const createError = require("http-errors");
const { PharmacyOnboardingModel } = require("./onboarding.model");
const {
  editablePharmacyStatuses,
  requiredDocumentTypes,
} = require("./onboarding.constants");

function normalizePhone(phone) {
  if (phone === undefined || phone === null) {
    return phone;
  }

  return phone.replace(/[\s-]/g, "");
}

function isUniqueViolation(error) {
  return error && error.code === "23505";
}

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

function toConflictError(error) {
  const constraint = error.constraint || "";

  if (constraint.includes("license_number")) {
    return createError(
      409,
      "A pharmacy with this license number already exists",
    );
  }

  if (constraint.includes("pharmacists_registration")) {
    return createError(
      409,
      "A pharmacist with this registration number already exists",
    );
  }

  return createError(409, "Pharmacy onboarding record already exists");
}

class PharmacyOnboardingService {
  constructor({ onboardingModel = new PharmacyOnboardingModel() } = {}) {
    this.onboardingModel = onboardingModel;
  }

  async createDraft(input) {
    try {
      return await this.onboardingModel.createDraft(
        this.normalizePharmacyInput(input),
      );
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getPharmacy(id) {
    const pharmacy = await this.onboardingModel.findById(id);

    if (!pharmacy) {
      throw createError(404, "Pharmacy not found");
    }

    return pharmacy;
  }

  async getOnboardingProfile(id) {
    const pharmacy = await this.getPharmacy(id);
    const [documents, pharmacists, statusHistory] = await Promise.all([
      this.onboardingModel.listDocuments(id),
      this.onboardingModel.listPharmacists(id),
      this.onboardingModel.listStatusHistory(id),
    ]);

    return {
      pharmacy,
      documents,
      pharmacists,
      missingRequiredDocuments: this.getMissingRequiredDocuments(documents),
      statusHistory,
    };
  }

  async listPharmacies(filters) {
    return this.onboardingModel.list({
      ownerUserId: filters.ownerUserId,
      status: filters.status,
      city: filters.city,
      search: filters.search,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async updateDraft(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertEditable(pharmacy);

    try {
      return await this.onboardingModel.updateProfile(
        id,
        this.normalizePharmacyInput(input),
      );
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async uploadDocument(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertEditable(pharmacy);

    return this.onboardingModel.upsertDocument(id, input);
  }

  async listDocuments(id) {
    await this.getPharmacy(id);
    return this.onboardingModel.listDocuments(id);
  }

  async addPharmacist(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertEditable(pharmacy);

    try {
      return await this.onboardingModel.addPharmacist(id, {
        ...input,
        phone: normalizePhone(input.phone),
      });
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listPharmacists(id) {
    await this.getPharmacy(id);
    return this.onboardingModel.listPharmacists(id);
  }

  async submitForReview(id, actorUserId) {
    const profile = await this.getOnboardingProfile(id);
    const allowedStatuses = ["DRAFT", "DOCUMENT_SUBMITTED", "REJECTED"];

    this.assertStatus(profile.pharmacy, allowedStatuses);

    const missingRequiredDocuments = this.getMissingRequiredDocuments(
      profile.documents,
    );

    if (missingRequiredDocuments.length > 0) {
      throw createError(400, "Required onboarding documents are missing", {
        details: {
          missingRequiredDocuments,
        },
      });
    }

    if (profile.pharmacists.length === 0) {
      throw createError(400, "At least one registered pharmacist is required");
    }

    return this.onboardingModel.updateStatus(id, {
      toStatus: "DOCUMENT_SUBMITTED",
      submittedAt: new Date(),
      actorUserId,
      reason: "Onboarding documents submitted",
      metadata: {
        submittedDocumentCount: profile.documents.length,
        pharmacistCount: profile.pharmacists.length,
      },
    });
  }

  async startReview(id, actorUserId) {
    const pharmacy = await this.getPharmacy(id);
    this.assertStatus(pharmacy, ["DOCUMENT_SUBMITTED"]);

    return this.onboardingModel.updateStatus(id, {
      toStatus: "UNDER_REVIEW",
      actorUserId,
      reason: "Admin review started",
    });
  }

  async approve(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertStatus(pharmacy, ["DOCUMENT_SUBMITTED", "UNDER_REVIEW"]);

    return this.onboardingModel.updateStatus(id, {
      toStatus: "APPROVED",
      reviewedAt: new Date(),
      reviewedByUserId: input.reviewedByUserId,
      actorUserId: input.reviewedByUserId,
      reason: input.reason || "Pharmacy onboarding approved",
    });
  }

  async reject(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertStatus(pharmacy, ["DOCUMENT_SUBMITTED", "UNDER_REVIEW"]);

    return this.onboardingModel.updateStatus(id, {
      toStatus: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: input.reviewedByUserId,
      actorUserId: input.reviewedByUserId,
      rejectionReason: input.reason,
      reason: input.reason,
    });
  }

  async suspend(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertStatus(pharmacy, ["APPROVED"]);
    this.assertReason(input.reason);

    return this.onboardingModel.updateStatus(id, {
      toStatus: "SUSPENDED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      actorUserId: input.actorUserId,
      reason: input.reason,
    });
  }

  async blacklist(id, input) {
    const pharmacy = await this.getPharmacy(id);
    this.assertReason(input.reason);

    if (pharmacy.status === "BLACKLISTED") {
      return pharmacy;
    }

    return this.onboardingModel.updateStatus(id, {
      toStatus: "BLACKLISTED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      actorUserId: input.actorUserId,
      reason: input.reason,
    });
  }

  getMissingRequiredDocuments(documents) {
    const uploadedTypes = new Set(
      documents.map((document) => document.documentType),
    );
    return requiredDocumentTypes.filter(
      (documentType) => !uploadedTypes.has(documentType),
    );
  }

  assertEditable(pharmacy) {
    this.assertStatus(pharmacy, editablePharmacyStatuses);
  }

  assertStatus(pharmacy, allowedStatuses) {
    if (!allowedStatuses.includes(pharmacy.status)) {
      throw createError(
        409,
        `Pharmacy status ${pharmacy.status} cannot perform this action`,
      );
    }
  }

  assertReason(reason) {
    if (!reason) {
      throw createError(400, "Reason is required");
    }
  }

  normalizePharmacyInput(input) {
    const normalized = { ...input };

    if (Object.prototype.hasOwnProperty.call(normalized, "city")) {
      normalized.city = normalized.city.trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, "state")) {
      normalized.state = normalized.state.trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, "pincode")) {
      normalized.pincode = normalized.pincode.trim();
    }

    return normalized;
  }

  rethrowKnownDatabaseError(error) {
    if (isUniqueViolation(error)) {
      throw toConflictError(error);
    }

    if (isForeignKeyViolation(error)) {
      throw createError(
        400,
        "Referenced user, pharmacy, or document does not exist",
      );
    }

    if (isCheckViolation(error)) {
      throw createError(
        400,
        "Pharmacy onboarding data violates database constraints",
      );
    }
  }
}

module.exports = {
  PharmacyOnboardingService,
};
