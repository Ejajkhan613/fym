const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { OrderService } = require("./order.service");
const {
  uuidParamSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  listPharmacyOffersQuerySchema,
  pharmacyIdSchema,
  acceptOfferSchema,
  rejectOfferSchema,
  transitionOrderSchema,
  cancelCustomerOrderSchema,
} = require("./order.validators");

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

function createOrderRoutes({ orderService = new OrderService() } = {}) {
  const router = express.Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = parse(createOrderSchema, req.body);
      const result = await orderService.createOrder(payload);

      res.status(201).json({ data: result });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listOrdersQuerySchema, req.query);
      const result = await orderService.listOrders(filters);

      res.json({
        data: result.orders,
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
      const order = await orderService.getOrder(id);

      res.json({ data: order });
    }),
  );

  router.get(
    "/:id/timeline",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const timeline = await orderService.getTimeline(id);

      res.json({ data: timeline });
    }),
  );

  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(cancelCustomerOrderSchema, req.body);
      const order = await orderService.cancelByCustomer(id, payload);

      res.json({ data: order });
    }),
  );

  return router;
}

function createPharmacyOrderRoutes({ orderService = new OrderService() } = {}) {
  const router = express.Router();

  router.get(
    "/offers",
    asyncHandler(async (req, res) => {
      const filters = parse(listPharmacyOffersQuerySchema, req.query);
      const result = await orderService.listPharmacyOffers(filters);

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

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listOrdersQuerySchema, req.query);
      const result = await orderService.listOrders(filters);

      res.json({
        data: result.orders,
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
      const { pharmacyId } = parse(pharmacyIdSchema, req.query);
      const order = await orderService.getPharmacyOrder(id, pharmacyId);

      res.json({ data: order });
    }),
  );

  router.post(
    "/:id/view",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const { pharmacyId } = parse(pharmacyIdSchema, req.body);
      const offer = await orderService.viewOffer(id, pharmacyId);

      res.json({ data: offer });
    }),
  );

  router.post(
    "/:id/accept",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(acceptOfferSchema, req.body);
      const result = await orderService.acceptOffer(id, payload);

      res.json({ data: result });
    }),
  );

  router.post(
    "/:id/reject",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(rejectOfferSchema, req.body);
      const offer = await orderService.rejectOffer(id, payload);

      res.json({ data: offer });
    }),
  );

  router.post(
    "/:id/mark-packing",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(transitionOrderSchema, req.body);
      const order = await orderService.markPacking(id, payload);

      res.json({ data: order });
    }),
  );

  router.post(
    "/:id/mark-packed",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(transitionOrderSchema, req.body);
      const order = await orderService.markPacked(id, payload);

      res.json({ data: order });
    }),
  );

  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(rejectOfferSchema, req.body);
      const order = await orderService.cancelByPharmacy(id, payload);

      res.json({ data: order });
    }),
  );

  return router;
}

function orderRouteErrorHandler(error, req, res, next) {
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
  createOrderRoutes,
  createPharmacyOrderRoutes,
  orderRouteErrorHandler,
};
