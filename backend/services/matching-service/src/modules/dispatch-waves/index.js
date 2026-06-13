const { MatchingModel } = require("./matching.model");
const { MatchingService } = require("./matching.service");
const {
  createMatchingRoutes,
  matchingRouteErrorHandler,
} = require("./matching.routes");
const validators = require("./matching.validators");

module.exports = {
  MatchingModel,
  MatchingService,
  createMatchingRoutes,
  matchingRouteErrorHandler,
  validators,
};
