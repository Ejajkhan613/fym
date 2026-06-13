const { PrescriptionModel } = require("./prescription.model");
const { PrescriptionService } = require("./prescription.service");
const {
  createPrescriptionRoutes,
  prescriptionRouteErrorHandler,
} = require("./prescription.routes");
const validators = require("./prescription.validators");

module.exports = {
  PrescriptionModel,
  PrescriptionService,
  createPrescriptionRoutes,
  prescriptionRouteErrorHandler,
  validators,
};
