const createError = require("http-errors");
const { AuthService } = require("./auth.service");
const { extractBearerToken } = require("./auth.routes");

function createRequireAuth({ authService = new AuthService() } = {}) {
  return async (req, res, next) => {
    try {
      const accessToken = extractBearerToken(req);
      const claims = authService.verifyAccessToken(accessToken);

      req.auth = {
        userId: claims.sub,
        role: claims.role,
        status: claims.status,
      };

      next();
    } catch (error) {
      next(createError(error.status || 401, error.message || "Unauthorized"));
    }
  };
}

function requireRoles(allowedRoles) {
  const roles = new Set(allowedRoles);

  return (req, res, next) => {
    if (!req.auth) {
      return next(createError(401, "Authentication is required"));
    }

    if (!roles.has(req.auth.role)) {
      return next(createError(403, "Insufficient permissions"));
    }

    return next();
  };
}

module.exports = {
  createRequireAuth,
  requireRoles,
};
