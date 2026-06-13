const { PharmacyOnboardingModel } = require("./onboarding.model");
const { PharmacyOnboardingService } = require("./onboarding.service");
const {
  createPharmacyOnboardingRoutes,
  pharmacyOnboardingErrorHandler,
} = require("./onboarding.routes");
const constants = require("./onboarding.constants");
const validators = require("./onboarding.validators");

module.exports = {
  PharmacyOnboardingModel,
  PharmacyOnboardingService,
  createPharmacyOnboardingRoutes,
  pharmacyOnboardingErrorHandler,
  constants,
  validators,
};
