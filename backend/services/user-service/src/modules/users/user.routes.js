const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { UserService } = require("./user.service");
const {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} = require("./user.validators");

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

function createUserRoutes({ userService = new UserService() } = {}) {
  const router = express.Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = parse(createUserSchema, req.body);
      const user = await userService.createUser(payload);

      res.status(201).json({ data: user });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listUsersQuerySchema, req.query);
      const result = await userService.listUsers(filters);

      res.json({
        data: result.users,
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
      const { id } = parse(userIdParamSchema, req.params);
      const user = await userService.getUserById(id);

      res.json({ data: user });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(userIdParamSchema, req.params);
      const payload = parse(updateUserSchema, req.body);
      const user = await userService.updateUser(id, payload);

      res.json({ data: user });
    }),
  );

  router.patch(
    "/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = parse(userIdParamSchema, req.params);
      const { status } = parse(updateUserStatusSchema, req.body);
      const user = await userService.updateUserStatus(id, status);

      res.json({ data: user });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(userIdParamSchema, req.params);

      await userService.deleteUser(id);
      res.status(204).send();
    }),
  );

  return router;
}

function userRouteErrorHandler(error, req, res, next) {
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
  createUserRoutes,
  userRouteErrorHandler,
};
