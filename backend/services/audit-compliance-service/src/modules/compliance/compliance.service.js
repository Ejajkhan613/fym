const createError = require("http-errors");
const { ComplianceModel } = require("./compliance.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class ComplianceService {
  constructor({ complianceModel = new ComplianceModel() } = {}) {
    this.complianceModel = complianceModel;
  }

  async listAuditLogs(filters = {}) {
    return this.complianceModel.listAuditLogs({
      actorUserId: filters.actorUserId,
      entityType: filters.entityType,
      entityId: filters.entityId,
      action: filters.action,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async logPrescriptionAccess(input, context = {}) {
    try {
      return await this.complianceModel.logPrescriptionAccess({
        ...input,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listPrescriptionAccess(filters = {}) {
    return this.complianceModel.listPrescriptionAccess({
      prescriptionId: filters.prescriptionId,
      actorUserId: filters.actorUserId,
      actorType: filters.actorType,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async listLicenseAlerts(filters = {}) {
    return this.complianceModel.listLicenseAlerts(filters.days ?? 30);
  }

  async createRegulatoryReport(input) {
    try {
      return await this.complianceModel.createRegulatoryReport(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listRegulatoryReports(filters = {}) {
    return this.complianceModel.listRegulatoryReports({
      reportType: filters.reportType,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async updateRegulatoryReport(id, input) {
    const report = await this.complianceModel.updateRegulatoryReport(id, input);
    if (!report) throw createError(404, "Regulatory report not found");
    return report;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced prescription or user does not exist");
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Compliance data violates database constraints");
    }
  }
}

module.exports = {
  ComplianceService,
};
