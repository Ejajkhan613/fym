const express = require("express");
const { ZodError } = require("zod");
const { AnalyticsService } = require("./analytics.service");

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function createAnalyticsRoutes({
  analyticsService = new AnalyticsService(),
} = {}) {
  const router = express.Router();

  router.get(
    "/overview",
    asyncHandler(async (req, res) => {
      const metrics = await analyticsService.getOverview();
      res.json({ data: metrics });
    }),
  );

  router.get(
    "/business",
    asyncHandler(async (req, res) => {
      const metrics = await analyticsService.getBusinessMetrics();
      res.json({ data: metrics });
    }),
  );

  router.get(
    "/operations",
    asyncHandler(async (req, res) => {
      const metrics = await analyticsService.getOperationsMetrics();
      res.json({ data: metrics });
    }),
  );

  router.get(
    "/compliance",
    asyncHandler(async (req, res) => {
      const metrics = await analyticsService.getComplianceMetrics();
      res.json({ data: metrics });
    }),
  );

  return router;
}

function analyticsRouteErrorHandler(error, req, res, next) {
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
  createAnalyticsRoutes,
  analyticsRouteErrorHandler,
};
