const { AdminModel } = require("./admin.model");
const { AdminService } = require("./admin.service");
const { createAdminRoutes, adminRouteErrorHandler } = require("./admin.routes");
const constants = require("./admin.constants");
const validators = require("./admin.validators");

module.exports = {
  AdminModel,
  AdminService,
  createAdminRoutes,
  adminRouteErrorHandler,
  constants,
  validators,
};
