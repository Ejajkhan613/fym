const express = require("express");
const {
  createDeliveryRoutes,
  deliveryRouteErrorHandler,
} = require("./modules/assignments");

function createDeliveryServiceApp(options = {}) {
  const app = express();
  const deliveryRoutes = createDeliveryRoutes(options);

  app.use(express.json({ limit: "1mb" }));
  app.use("/deliveries", deliveryRoutes);
  app.use("/delivery", deliveryRoutes);
  app.use(deliveryRouteErrorHandler);
  return app;
}

module.exports = { createDeliveryServiceApp };
