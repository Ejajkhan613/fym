const createError = require("http-errors");
const { AdminModel } = require("./admin.model");
const { adminActions } = require("./admin.constants");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class AdminService {
  constructor({ adminModel = new AdminModel() } = {}) {
    this.adminModel = adminModel;
  }

  async getDashboard() {
    return this.adminModel.getDashboardMetrics();
  }

  async listUsers(filters = {}) {
    return this.adminModel.listUsers({
      role: filters.role,
      status: filters.status,
      search: filters.search,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async getUser(id) {
    const user = await this.adminModel.findUserById(id);

    if (!user) {
      throw createError(404, "User not found");
    }

    return user;
  }

  async updateUserStatus(id, input, context = {}) {
    await this.getUser(id);
    this.assertReasonForSensitiveUserStatus(input.status, input.reason);

    try {
      const user = await this.adminModel.updateUserStatus(id, input.status, {
        actorUserId: input.actorUserId,
        reason: input.reason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      if (!user) {
        throw createError(404, "User not found");
      }

      return user;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listPharmacies(filters = {}) {
    return this.adminModel.listPharmacies({
      status: filters.status,
      city: filters.city,
      ownerUserId: filters.ownerUserId,
      search: filters.search,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async getPharmacyProfile(id) {
    const profile = await this.adminModel.getPharmacyProfile(id);

    if (!profile) {
      throw createError(404, "Pharmacy not found");
    }

    return profile;
  }

  async startPharmacyReview(id, input, context = {}) {
    const pharmacy = await this.getPharmacyOrThrow(id);
    this.assertPharmacyStatus(pharmacy, ["DOCUMENT_SUBMITTED"]);

    return this.updatePharmacyStatus(id, {
      toStatus: "UNDER_REVIEW",
      actorUserId: input.actorUserId,
      reason: input.reason || "Admin review started",
      auditAction: adminActions.PHARMACY_REVIEW_STARTED,
      context,
    });
  }

  async approvePharmacy(id, input, context = {}) {
    const pharmacy = await this.getPharmacyOrThrow(id);
    this.assertPharmacyStatus(pharmacy, ["DOCUMENT_SUBMITTED", "UNDER_REVIEW"]);

    return this.updatePharmacyStatus(id, {
      toStatus: "APPROVED",
      actorUserId: input.actorUserId,
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      reason: input.reason || "Pharmacy onboarding approved",
      auditAction: adminActions.PHARMACY_APPROVED,
      context,
    });
  }

  async rejectPharmacy(id, input, context = {}) {
    const pharmacy = await this.getPharmacyOrThrow(id);
    this.assertPharmacyStatus(pharmacy, ["DOCUMENT_SUBMITTED", "UNDER_REVIEW"]);
    this.assertReason(input.reason);

    return this.updatePharmacyStatus(id, {
      toStatus: "REJECTED",
      actorUserId: input.actorUserId,
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      rejectionReason: input.reason,
      reason: input.reason,
      auditAction: adminActions.PHARMACY_REJECTED,
      context,
    });
  }

  async suspendPharmacy(id, input, context = {}) {
    const pharmacy = await this.getPharmacyOrThrow(id);
    this.assertPharmacyStatus(pharmacy, ["APPROVED"]);
    this.assertReason(input.reason);

    return this.updatePharmacyStatus(id, {
      toStatus: "SUSPENDED",
      actorUserId: input.actorUserId,
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      reason: input.reason,
      auditAction: adminActions.PHARMACY_SUSPENDED,
      context,
    });
  }

  async blacklistPharmacy(id, input, context = {}) {
    const pharmacy = await this.getPharmacyOrThrow(id);
    this.assertReason(input.reason);

    if (pharmacy.status === "BLACKLISTED") {
      return pharmacy;
    }

    return this.updatePharmacyStatus(id, {
      toStatus: "BLACKLISTED",
      actorUserId: input.actorUserId,
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      reason: input.reason,
      auditAction: adminActions.PHARMACY_BLACKLISTED,
      context,
    });
  }

  async listAuditLogs(filters = {}) {
    return this.adminModel.listAuditLogs({
      actorUserId: filters.actorUserId,
      entityType: filters.entityType,
      entityId: filters.entityId,
      action: filters.action,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async getPharmacyOrThrow(id) {
    const pharmacy = await this.adminModel.findPharmacyById(id);

    if (!pharmacy) {
      throw createError(404, "Pharmacy not found");
    }

    return pharmacy;
  }

  async updatePharmacyStatus(id, statusChange) {
    try {
      const pharmacy = await this.adminModel.updatePharmacyStatus(id, {
        toStatus: statusChange.toStatus,
        actorUserId: statusChange.actorUserId,
        reviewedByUserId: statusChange.reviewedByUserId,
        reviewedAt: statusChange.reviewedAt,
        rejectionReason: statusChange.rejectionReason,
        reason: statusChange.reason,
        auditAction: statusChange.auditAction,
        ipAddress: statusChange.context.ipAddress,
        userAgent: statusChange.context.userAgent,
      });

      if (!pharmacy) {
        throw createError(404, "Pharmacy not found");
      }

      return pharmacy;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  assertPharmacyStatus(pharmacy, allowedStatuses) {
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

  assertReasonForSensitiveUserStatus(status, reason) {
    if (["suspended", "blocked", "deleted"].includes(status)) {
      this.assertReason(reason);
    }
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced admin actor or entity does not exist");
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Admin operation violates database constraints");
    }
  }
}

module.exports = {
  AdminService,
};
