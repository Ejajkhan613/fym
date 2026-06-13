const { AuthModel } = require("./auth.model");
const { AuthService } = require("./auth.service");
const {
  createAuthRoutes,
  authRouteErrorHandler,
  extractBearerToken,
} = require("./auth.routes");
const { createRequireAuth, requireRoles } = require("./auth.middleware");
const validators = require("./auth.validators");

module.exports = {
  AuthModel,
  AuthService,
  createAuthRoutes,
  authRouteErrorHandler,
  extractBearerToken,
  createRequireAuth,
  requireRoles,
  validators,
};
