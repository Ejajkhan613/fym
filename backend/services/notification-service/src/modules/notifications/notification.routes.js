const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { NotificationService } = require("./notification.service");
const {
  uuidParamSchema,
  queueNotificationSchema,
  listNotificationsQuerySchema,
  markFailedSchema,
  cancelNotificationSchema,
} = require("./notification.validators");

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

function createNotificationRoutes({
  notificationService = new NotificationService(),
} = {}) {
  const router = express.Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = parse(queueNotificationSchema, req.body);
      const notification = await notificationService.queue(payload);
      res.status(201).json({ data: notification });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listNotificationsQuerySchema, req.query);
      const result = await notificationService.list(filters);
      res.json({
        data: result.notifications,
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
      const notification = await notificationService.get(id);
      res.json({ data: notification });
    }),
  );

  router.post(
    "/:id/mark-sent",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const notification = await notificationService.markSent(id);
      res.json({ data: notification });
    }),
  );

  router.post(
    "/:id/mark-failed",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(markFailedSchema, req.body);
      const notification = await notificationService.markFailed(id, payload);
      res.json({ data: notification });
    }),
  );

  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(cancelNotificationSchema, req.body || {});
      const notification = await notificationService.cancel(id, payload);
      res.json({ data: notification });
    }),
  );

  return router;
}

function notificationRouteErrorHandler(error, req, res, next) {
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
  createNotificationRoutes,
  notificationRouteErrorHandler,
};
