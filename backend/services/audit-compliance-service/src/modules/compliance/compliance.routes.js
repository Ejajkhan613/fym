const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { ComplianceService } = require("./compliance.service");
const {
  uuidParamSchema,
  listAuditLogsQuerySchema,
  logPrescriptionAccessSchema,
  listPrescriptionAccessQuerySchema,
  licenseAlertsQuerySchema,
  createRegulatoryReportSchema,
  listRegulatoryReportsQuerySchema,
  updateRegulatoryReportSchema,
} = require("./compliance.validators");

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw createError(400, "Validation failed", {
    details: result.error.flatten(),
  });
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function getRequestContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function createComplianceRoutes({
  complianceService = new ComplianceService(),
} = {}) {
  const router = express.Router();

  router.get(
    "/logs",
    asyncHandler(async (req, res) => {
      const filters = parse(listAuditLogsQuerySchema, req.query);
      const result = await complianceService.listAuditLogs(filters);
      res.json({
        data: result.logs,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.post(
    "/prescription-access",
    asyncHandler(async (req, res) => {
      const payload = parse(logPrescriptionAccessSchema, req.body);
      const log = await complianceService.logPrescriptionAccess(
        payload,
        getRequestContext(req),
      );
      res.status(201).json({ data: log });
    }),
  );

  router.get(
    "/prescription-access",
    asyncHandler(async (req, res) => {
      const filters = parse(listPrescriptionAccessQuerySchema, req.query);
      const result = await complianceService.listPrescriptionAccess(filters);
      res.json({
        data: result.logs,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/license-alerts",
    asyncHandler(async (req, res) => {
      const filters = parse(licenseAlertsQuerySchema, req.query);
      const alerts = await complianceService.listLicenseAlerts(filters);
      res.json({ data: alerts, meta: { total: alerts.length } });
    }),
  );

  router.post(
    "/regulatory-reports",
    asyncHandler(async (req, res) => {
      const payload = parse(createRegulatoryReportSchema, req.body);
      const report = await complianceService.createRegulatoryReport(payload);
      res.status(201).json({ data: report });
    }),
  );

  router.get(
    "/regulatory-reports",
    asyncHandler(async (req, res) => {
      const filters = parse(listRegulatoryReportsQuerySchema, req.query);
      const result = await complianceService.listRegulatoryReports(filters);
      res.json({
        data: result.reports,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.patch(
    "/regulatory-reports/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateRegulatoryReportSchema, req.body);
      const report = await complianceService.updateRegulatoryReport(
        id,
        payload,
      );
      res.json({ data: report });
    }),
  );

  return router;
}

function complianceRouteErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const statusCode = error.statusCode || error.status || 500;
  const payload = {
    error: {
      message: statusCode === 500 ? "Internal server error" : error.message,
    },
  };
  if (error.details) payload.error.details = error.details;
  if (error instanceof ZodError) payload.error.details = error.flatten();
  return res.status(statusCode).json(payload);
}

module.exports = {
  createComplianceRoutes,
  complianceRouteErrorHandler,
};
