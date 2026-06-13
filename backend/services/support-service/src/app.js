const express = require("express");
const {
  createSupportRoutes,
  supportRouteErrorHandler,
} = require("./modules/tickets");

function createSupportServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/support", createSupportRoutes(options));
  app.use(supportRouteErrorHandler);

  return app;
}

module.exports = {
  createSupportServiceApp,
};
