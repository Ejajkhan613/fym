const { PenaltyModel } = require("./penalty.model");
const { PenaltyService } = require("./penalty.service");
const {
  createPenaltyRoutes,
  penaltyRouteErrorHandler,
} = require("./penalty.routes");
const validators = require("./penalty.validators");

module.exports = {
  PenaltyModel,
  PenaltyService,
  createPenaltyRoutes,
  penaltyRouteErrorHandler,
  validators,
};
