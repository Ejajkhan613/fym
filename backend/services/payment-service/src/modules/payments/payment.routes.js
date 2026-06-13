const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { PaymentService } = require("./payment.service");
const {
  uuidParamSchema,
  orderIdParamSchema,
  initiatePaymentSchema,
  paymentStatusUpdateSchema,
  failPaymentSchema,
  createRefundSchema,
  updateRefundStatusSchema,
} = require("./payment.validators");

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

function createPaymentRoutes({ paymentService = new PaymentService() } = {}) {
  const router = express.Router();

  router.post(
    "/initiate",
    asyncHandler(async (req, res) => {
      const payload = parse(initiatePaymentSchema, req.body);
      const payment = await paymentService.initiate(payload);
      res.status(201).json({ data: payment });
    }),
  );

  router.get(
    "/order/:orderId",
    asyncHandler(async (req, res) => {
      const { orderId } = parse(orderIdParamSchema, req.params);
      const payments = await paymentService.listForOrder(orderId);
      res.json({ data: payments });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payment = await paymentService.get(id);
      res.json({ data: payment });
    }),
  );

  router.post(
    "/:id/authorize",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(paymentStatusUpdateSchema, req.body);
      const payment = await paymentService.authorize(id, payload);
      res.json({ data: payment });
    }),
  );

  router.post(
    "/:id/capture",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(paymentStatusUpdateSchema, req.body);
      const payment = await paymentService.capture(id, payload);
      res.json({ data: payment });
    }),
  );

  router.post(
    "/:id/fail",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(failPaymentSchema, req.body);
      const payment = await paymentService.fail(id, payload);
      res.json({ data: payment });
    }),
  );

  router.post(
    "/:id/refunds",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(createRefundSchema, req.body);
      const refund = await paymentService.createRefund(id, payload);
      res.status(201).json({ data: refund });
    }),
  );

  router.patch(
    "/refunds/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateRefundStatusSchema, req.body);
      const refund = await paymentService.updateRefundStatus(id, payload);
      res.json({ data: refund });
    }),
  );

  return router;
}

function paymentRouteErrorHandler(error, req, res, next) {
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
  createPaymentRoutes,
  paymentRouteErrorHandler,
};
