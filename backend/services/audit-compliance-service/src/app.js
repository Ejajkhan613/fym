const express = require("express");
const {
  createComplianceRoutes,
  complianceRouteErrorHandler,
} = require("./modules/compliance");

function createAuditComplianceServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/audit", createComplianceRoutes(options));
  app.use(complianceRouteErrorHandler);

  return app;
}

module.exports = {
  createAuditComplianceServiceApp,
};
