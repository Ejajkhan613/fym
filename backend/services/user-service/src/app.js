const express = require("express");
const { createUserRoutes, userRouteErrorHandler } = require("./modules/users");
const { createCustomerRoutes } = require("./modules/customers");

function createUserServiceApp(options = {}) {
  const app = express();
  const userRoutes = createUserRoutes(options);
  const customerRoutes = createCustomerRoutes(options);

  app.use(express.json({ limit: "1mb" }));
  app.use("/users", userRoutes);
  app.use("/customers", customerRoutes);
  app.use(userRouteErrorHandler);

  return app;
}

module.exports = {
  createUserServiceApp,
};
