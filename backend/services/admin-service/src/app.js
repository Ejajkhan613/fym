const express = require("express");
const {
  createAdminRoutes,
  adminRouteErrorHandler,
} = require("./modules/admin");

function createAdminServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/admin", createAdminRoutes(options));
  app.use(adminRouteErrorHandler);

  return app;
}

module.exports = {
  createAdminServiceApp,
};
