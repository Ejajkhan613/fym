const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { DeliveryService } = require("./delivery.service");
const {
  uuidParamSchema,
  assignDeliverySchema,
  listAssignmentsQuerySchema,
  trackingEventSchema,
  pickupDeliveryActionSchema,
  riderActionSchema,
  failDeliverySchema,
  proofOfDeliverySchema,
} = require("./delivery.validators");

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

function createDeliveryRoutes({
  deliveryService = new DeliveryService(),
} = {}) {
  const router = express.Router();

  router.post(
    "/assignments",
    asyncHandler(async (req, res) => {
      const payload = parse(assignDeliverySchema, req.body);
      const assignment = await deliveryService.assign(payload);
      res.status(201).json({ data: assignment });
    }),
  );

  router.get(
    "/assignments",
    asyncHandler(async (req, res) => {
      const filters = parse(listAssignmentsQuerySchema, req.query);
      const result = await deliveryService.list(filters);
      res.json({
        data: result.assignments,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/assignments/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const assignment = await deliveryService.get(id);
      res.json({ data: assignment });
    }),
  );

  router.post(
    "/assignments/:id/pickup",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(pickupDeliveryActionSchema, req.body || {});
      const assignment = await deliveryService.markPickedUp(id, payload);
      res.json({ data: assignment });
    }),
  );

  router.post(
    "/assignments/:id/out-for-delivery",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(riderActionSchema, req.body || {});
      const assignment = await deliveryService.markOutForDelivery(id, payload);
      res.json({ data: assignment });
    }),
  );

  router.post(
    "/assignments/:id/fail",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(failDeliverySchema, req.body);
      const assignment = await deliveryService.failDelivery(id, payload);
      res.json({ data: assignment });
    }),
  );

  router.post(
    "/assignments/:id/tracking",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(trackingEventSchema, req.body);
      const event = await deliveryService.addTrackingEvent(id, payload);
      res.status(201).json({ data: event });
    }),
  );

  router.get(
    "/assignments/:id/tracking",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const events = await deliveryService.listTrackingEvents(id);
      res.json({ data: events });
    }),
  );

  router.post(
    "/assignments/:id/proof",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(proofOfDeliverySchema, req.body);
      const proof = await deliveryService.createProofOfDelivery(id, payload);
      res.status(201).json({ data: proof });
    }),
  );

  return router;
}

function deliveryRouteErrorHandler(error, req, res, next) {
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
  createDeliveryRoutes,
  deliveryRouteErrorHandler,
};
