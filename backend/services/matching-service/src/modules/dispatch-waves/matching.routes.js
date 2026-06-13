const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { MatchingService } = require("./matching.service");
const {
  candidateQuerySchema,
  dispatchSchema,
  listOffersQuerySchema,
} = require("./matching.validators");

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

function createMatchingRoutes({
  matchingService = new MatchingService(),
} = {}) {
  const router = express.Router();

  router.post(
    "/candidates",
    asyncHandler(async (req, res) => {
      const payload = parse(candidateQuerySchema, req.body || {});
      const candidates = await matchingService.selectCandidates(payload);
      res.json({ data: candidates, meta: { total: candidates.length } });
    }),
  );

  router.post(
    "/dispatch",
    asyncHandler(async (req, res) => {
      const payload = parse(dispatchSchema, req.body);
      const result = await matchingService.dispatch(payload);
      res.status(201).json({ data: result });
    }),
  );

  router.get(
    "/offers",
    asyncHandler(async (req, res) => {
      const filters = parse(listOffersQuerySchema, req.query);
      const result = await matchingService.listOffers(filters);
      res.json({
        data: result.offers,
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

function matchingRouteErrorHandler(error, req, res, next) {
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
  createMatchingRoutes,
  matchingRouteErrorHandler,
};
