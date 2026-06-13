const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { SupportService } = require("./support.service");
const {
  uuidParamSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  addMessageSchema,
} = require("./support.validators");

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

function createSupportRoutes({ supportService = new SupportService() } = {}) {
  const router = express.Router();

  router.post(
    "/tickets",
    asyncHandler(async (req, res) => {
      const payload = parse(createTicketSchema, req.body);
      const ticket = await supportService.createTicket(payload);
      res.status(201).json({ data: ticket });
    }),
  );

  router.get(
    "/tickets",
    asyncHandler(async (req, res) => {
      const filters = parse(listTicketsQuerySchema, req.query);
      const result = await supportService.listTickets(filters);
      res.json({
        data: result.tickets,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/tickets/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const ticket = await supportService.getTicket(id);
      res.json({ data: ticket });
    }),
  );

  router.patch(
    "/tickets/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateTicketSchema, req.body);
      const ticket = await supportService.updateTicket(id, payload);
      res.json({ data: ticket });
    }),
  );

  router.post(
    "/tickets/:id/messages",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(addMessageSchema, req.body);
      const message = await supportService.addMessage(id, payload);
      res.status(201).json({ data: message });
    }),
  );

  return router;
}

function supportRouteErrorHandler(error, req, res, next) {
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
  createSupportRoutes,
  supportRouteErrorHandler,
};
