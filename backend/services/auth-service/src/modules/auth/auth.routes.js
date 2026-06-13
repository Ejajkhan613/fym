const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { AuthService } = require("./auth.service");
const {
  loginOtpSchema,
  signupOtpSchema,
  refreshSchema,
  logoutSchema,
  requestOtpSchema,
  verifyOtpSchema,
} = require("./auth.validators");

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

function getRequestContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function extractBearerToken(req) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw createError(401, "Bearer token is required");
  }

  return token;
}

function createAuthRoutes({ authService = new AuthService() } = {}) {
  const router = express.Router();

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const payload = parse(loginOtpSchema, req.body);
      const result = await authService.requestLoginOtp(
        payload,
        getRequestContext(req),
      );

      res.status(202).json({ data: result });
    }),
  );

  router.post(
    "/signup",
    asyncHandler(async (req, res) => {
      const payload = parse(signupOtpSchema, req.body);
      const result = await authService.requestOtp(
        {
          phone: payload.phone,
          purpose: "register",
        },
        getRequestContext(req),
      );

      res.status(202).json({ data: result });
    }),
  );

  router.post(
    "/otp/request",
    asyncHandler(async (req, res) => {
      const payload = parse(requestOtpSchema, req.body);
      const result = await authService.requestOtp(
        payload,
        getRequestContext(req),
      );

      res.status(202).json({ data: result });
    }),
  );

  router.post(
    "/otp/verify",
    asyncHandler(async (req, res) => {
      const payload = parse(verifyOtpSchema, req.body);
      const result = await authService.verifyOtp(
        payload,
        getRequestContext(req),
      );

      res.json({ data: result });
    }),
  );

  router.post(
    "/refresh",
    asyncHandler(async (req, res) => {
      const payload = parse(refreshSchema, req.body);
      const result = await authService.refresh(payload.refreshToken);

      res.json({ data: result });
    }),
  );

  router.post(
    "/logout",
    asyncHandler(async (req, res) => {
      const payload = parse(logoutSchema, req.body);
      const result = await authService.logout(payload.refreshToken);

      res.json({ data: result });
    }),
  );

  router.post(
    "/logout-all",
    asyncHandler(async (req, res) => {
      const result = await authService.logoutAll(extractBearerToken(req));

      res.json({ data: result });
    }),
  );

  router.get(
    "/me",
    asyncHandler(async (req, res) => {
      const user = await authService.getCurrentUser(extractBearerToken(req));

      res.json({ data: user });
    }),
  );

  return router;
}

function authRouteErrorHandler(error, req, res, next) {
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
  createAuthRoutes,
  authRouteErrorHandler,
  extractBearerToken,
};
