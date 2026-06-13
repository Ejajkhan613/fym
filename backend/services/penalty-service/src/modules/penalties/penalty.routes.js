const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { PenaltyService } = require("./penalty.service");
const {
  uuidParamSchema,
  createPenaltySchema,
  listPenaltiesQuerySchema,
  waivePenaltySchema,
  appealPenaltySchema,
  listAppealsQuerySchema,
  reviewAppealSchema,
} = require("./penalty.validators");

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

function createPenaltyRoutes({ penaltyService = new PenaltyService() } = {}) {
  const router = express.Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = parse(createPenaltySchema, req.body);
      const penalty = await penaltyService.create(payload);
      res.status(201).json({ data: penalty });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listPenaltiesQuerySchema, req.query);
      const result = await penaltyService.list(filters);
      res.json({
        data: result.penalties,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/appeals",
    asyncHandler(async (req, res) => {
      const filters = parse(listAppealsQuerySchema, req.query);
      const result = await penaltyService.listAppeals(filters);
      res.json({
        data: result.appeals,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const penalty = await penaltyService.get(id);
      res.json({ data: penalty });
    }),
  );

  router.post(
    "/:id/waive",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(waivePenaltySchema, req.body);
      const penalty = await penaltyService.waive(id, payload);
      res.json({ data: penalty });
    }),
  );

  router.post(
    "/:id/paid",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const penalty = await penaltyService.markPaid(id);
      res.json({ data: penalty });
    }),
  );

  router.post(
    "/:id/appeal",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(appealPenaltySchema, req.body);
      const appeal = await penaltyService.appeal(id, payload);
      res.status(201).json({ data: appeal });
    }),
  );

  router.post(
    "/appeals/:id/review",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(reviewAppealSchema, req.body);
      const appeal = await penaltyService.reviewAppeal(id, payload);
      res.json({ data: appeal });
    }),
  );

  return router;
}

function penaltyRouteErrorHandler(error, req, res, next) {
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
  createPenaltyRoutes,
  penaltyRouteErrorHandler,
};
