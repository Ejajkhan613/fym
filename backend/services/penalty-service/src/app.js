const express = require("express");
const {
  createPenaltyRoutes,
  penaltyRouteErrorHandler,
} = require("./modules/penalties");

function createPenaltyServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/penalties", createPenaltyRoutes(options));
  app.use(penaltyRouteErrorHandler);

  return app;
}

module.exports = {
  createPenaltyServiceApp,
};
