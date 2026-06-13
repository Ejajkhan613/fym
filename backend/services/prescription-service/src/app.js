const express = require("express");
const {
  createPrescriptionRoutes,
  prescriptionRouteErrorHandler,
} = require("./modules/uploads");

function createPrescriptionServiceApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/prescriptions", createPrescriptionRoutes(options));
  app.use(prescriptionRouteErrorHandler);
  return app;
}

module.exports = { createPrescriptionServiceApp };
