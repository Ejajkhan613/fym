const express = require("express");
const {
  createMedicineRoutes,
  medicineRouteErrorHandler,
} = require("./modules/medicines");

function createCatalogServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/medicines", createMedicineRoutes(options));
  app.use(medicineRouteErrorHandler);

  return app;
}

module.exports = {
  createCatalogServiceApp,
};
