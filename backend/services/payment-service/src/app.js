const express = require("express");
const {
  createPaymentRoutes,
  paymentRouteErrorHandler,
} = require("./modules/payments");

function createPaymentServiceApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/payments", createPaymentRoutes(options));
  app.use(paymentRouteErrorHandler);
  return app;
}

module.exports = { createPaymentServiceApp };
