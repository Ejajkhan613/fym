const express = require("express");
const {
  createAnalyticsRoutes,
  analyticsRouteErrorHandler,
} = require("./modules/metrics");

function createAnalyticsServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/analytics", createAnalyticsRoutes(options));
  app.use(analyticsRouteErrorHandler);

  return app;
}

module.exports = {
  createAnalyticsServiceApp,
};
