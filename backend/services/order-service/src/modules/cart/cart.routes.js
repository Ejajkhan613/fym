const express = require("express");
const createError = require("http-errors");
const { CartService } = require("./cart.service");
const {
  uuidParamSchema,
  cartQuerySchema,
  addCartItemSchema,
  updateCartItemSchema,
} = require("./cart.validators");

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

function createCartRoutes({ cartService = new CartService() } = {}) {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { customerId } = parse(cartQuerySchema, req.query);
      const cart = await cartService.getCart(customerId);
      res.json({ data: cart });
    }),
  );

  router.post(
    "/items",
    asyncHandler(async (req, res) => {
      const payload = parse(addCartItemSchema, req.body);
      const item = await cartService.addItem(payload);
      res.status(201).json({ data: item });
    }),
  );

  router.patch(
    "/items/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateCartItemSchema, req.body);
      const item = await cartService.updateItem(id, payload);
      res.json({ data: item });
    }),
  );

  router.delete(
    "/items/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      await cartService.removeItem(id);
      res.status(204).send();
    }),
  );

  router.delete(
    "/",
    asyncHandler(async (req, res) => {
      const { customerId } = parse(cartQuerySchema, req.query);
      const result = await cartService.clear(customerId);
      res.json({ data: result });
    }),
  );

  return router;
}

module.exports = {
  createCartRoutes,
};
