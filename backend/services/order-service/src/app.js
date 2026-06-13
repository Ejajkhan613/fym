const express = require("express");
const {
  createOrderRoutes,
  createPharmacyOrderRoutes,
  orderRouteErrorHandler,
} = require("./modules/orders");
const { createCartRoutes } = require("./modules/cart");

function createOrderServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/cart", createCartRoutes(options));
  app.use("/orders", createOrderRoutes(options));
  app.use("/pharmacy/orders", createPharmacyOrderRoutes(options));
  app.use(orderRouteErrorHandler);

  return app;
}

module.exports = {
  createOrderServiceApp,
};
