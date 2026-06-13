const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { AdminService } = require("./admin.service");
const {
  uuidParamSchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
  listPharmaciesQuerySchema,
  adminActorSchema,
  requiredReasonActorSchema,
  listAuditLogsQuerySchema,
} = require("./admin.validators");

function parse(schema, value) {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

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

function createAdminRoutes({ adminService = new AdminService() } = {}) {
  const router = express.Router();

  router.get(
    "/dashboard",
    asyncHandler(async (req, res) => {
      const dashboard = await adminService.getDashboard();

      res.json({ data: dashboard });
    }),
  );

  router.get(
    "/users",
    asyncHandler(async (req, res) => {
      const filters = parse(listUsersQuerySchema, req.query);
      const result = await adminService.listUsers(filters);

      res.json({
        data: result.users,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/users/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const user = await adminService.getUser(id);

      res.json({ data: user });
    }),
  );

  router.patch(
    "/users/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateUserStatusSchema, req.body);
      const user = await adminService.updateUserStatus(
        id,
        payload,
        getRequestContext(req),
      );

      res.json({ data: user });
    }),
  );

  router.get(
    "/pharmacies",
    asyncHandler(async (req, res) => {
      const filters = parse(listPharmaciesQuerySchema, req.query);
      const result = await adminService.listPharmacies(filters);

      res.json({
        data: result.pharmacies,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/pharmacies/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const profile = await adminService.getPharmacyProfile(id);

      res.json({ data: profile });
    }),
  );

  router.post(
    "/pharmacies/:id/review/start",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(adminActorSchema, req.body);
      const pharmacy = await adminService.startPharmacyReview(
        id,
        payload,
        getRequestContext(req),
      );

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/pharmacies/:id/review/approve",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(adminActorSchema, req.body);
      const pharmacy = await adminService.approvePharmacy(
        id,
        payload,
        getRequestContext(req),
      );

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/pharmacies/:id/review/reject",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(requiredReasonActorSchema, req.body);
      const pharmacy = await adminService.rejectPharmacy(
        id,
        payload,
        getRequestContext(req),
      );

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/pharmacies/:id/suspend",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(requiredReasonActorSchema, req.body);
      const pharmacy = await adminService.suspendPharmacy(
        id,
        payload,
        getRequestContext(req),
      );

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/pharmacies/:id/blacklist",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(requiredReasonActorSchema, req.body);
      const pharmacy = await adminService.blacklistPharmacy(
        id,
        payload,
        getRequestContext(req),
      );

      res.json({ data: pharmacy });
    }),
  );

  router.get(
    "/audit-logs",
    asyncHandler(async (req, res) => {
      const filters = parse(listAuditLogsQuerySchema, req.query);
      const result = await adminService.listAuditLogs(filters);

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

  return router;
}

function adminRouteErrorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const payload = {
    error: {
      message: statusCode === 500 ? "Internal server error" : error.message,
    },
  };

  if (error.details) {
    payload.error.details = error.details;
  }

  if (error instanceof ZodError) {
    payload.error.details = error.flatten();
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  createAdminRoutes,
  adminRouteErrorHandler,
};
