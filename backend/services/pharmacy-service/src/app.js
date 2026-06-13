const express = require("express");
const {
  createPharmacyOnboardingRoutes,
  pharmacyOnboardingErrorHandler,
} = require("./modules/onboarding");

function createPharmacyServiceApp(options = {}) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use("/pharmacies/onboarding", createPharmacyOnboardingRoutes(options));
  app.use(pharmacyOnboardingErrorHandler);

  return app;
}

module.exports = {
  createPharmacyServiceApp,
};
