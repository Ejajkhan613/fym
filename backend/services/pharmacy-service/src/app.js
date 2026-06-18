const express = require("express");
const {
  createPharmacyOnboardingRoutes,
  pharmacyOnboardingErrorHandler,
} = require("./modules/onboarding");
const {
  createPharmacyInventoryRoutes,
  pharmacyInventoryErrorHandler,
} = require("./modules/inventory");

function createPharmacyServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/pharmacies/onboarding", createPharmacyOnboardingRoutes(options));
  app.use(
    "/pharmacies/:pharmacyId/inventory",
    createPharmacyInventoryRoutes(options),
  );
  app.use(pharmacyInventoryErrorHandler);
  app.use(pharmacyOnboardingErrorHandler);

  return app;
}

module.exports = {
  createPharmacyServiceApp,
};
