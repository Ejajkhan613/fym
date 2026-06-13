const { AnalyticsModel } = require("./analytics.model");
const { AnalyticsService } = require("./analytics.service");
const {
  createAnalyticsRoutes,
  analyticsRouteErrorHandler,
} = require("./analytics.routes");

module.exports = {
  AnalyticsModel,
  AnalyticsService,
  createAnalyticsRoutes,
  analyticsRouteErrorHandler,
};
