const express = require("express");
const { createAuthRoutes, authRouteErrorHandler } = require("./modules/auth");

function createAuthServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/auth", createAuthRoutes(options));
  app.use(authRouteErrorHandler);

  return app;
}

module.exports = {
  createAuthServiceApp,
};
