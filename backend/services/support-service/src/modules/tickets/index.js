const { SupportModel } = require("./support.model");
const { SupportService } = require("./support.service");
const {
  createSupportRoutes,
  supportRouteErrorHandler,
} = require("./support.routes");
const validators = require("./support.validators");

module.exports = {
  SupportModel,
  SupportService,
  createSupportRoutes,
  supportRouteErrorHandler,
  validators,
};
