const express = require("express");
const {
  createMatchingRoutes,
  matchingRouteErrorHandler,
} = require("./modules/dispatch-waves");

function createMatchingServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/matching", createMatchingRoutes(options));
  app.use(matchingRouteErrorHandler);

  return app;
}

module.exports = {
  createMatchingServiceApp,
};
