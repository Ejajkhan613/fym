const express = require("express");
const createError = require("http-errors");
const { OrderModel } = require("./order.model");
const { listRealtimeEventsQuerySchema } = require("./order.validators");

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

function createRealtimeRoutes({ orderModel = new OrderModel() } = {}) {
  const router = express.Router();

  router.get(
    "/events",
    asyncHandler(async (req, res) => {
      const filters = parse(listRealtimeEventsQuerySchema, req.query);
      const result = await orderModel.listRealtimeEvents({
        channel: filters.channel,
        aggregateId: filters.orderId,
        eventName: filters.eventName,
        afterId: filters.afterId,
        after: filters.after,
        direction: filters.direction,
        limit: filters.limit,
      });
      const newestEvent =
        filters.direction === "desc" ? result.events[0] : result.events.at(-1);

      res.json({
        data: result.events,
        meta: {
          total: result.total,
          limit: filters.limit,
          newestEventId: newestEvent?.id || null,
          newestCreatedAt: newestEvent?.createdAt || null,
        },
      });
    }),
  );

  return router;
}

module.exports = {
  createRealtimeRoutes,
};
