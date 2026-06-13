const express = require("express");
const {
  createNotificationRoutes,
  notificationRouteErrorHandler,
} = require("./modules/notifications");

function createNotificationServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/notifications", createNotificationRoutes(options));
  app.use(notificationRouteErrorHandler);

  return app;
}

module.exports = {
  createNotificationServiceApp,
};
