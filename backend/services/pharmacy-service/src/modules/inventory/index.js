const { PharmacyInventoryModel } = require("./inventory.model");
const { PharmacyInventoryService } = require("./inventory.service");
const {
  createPharmacyInventoryRoutes,
  pharmacyInventoryErrorHandler,
} = require("./inventory.routes");
const validators = require("./inventory.validators");

module.exports = {
  PharmacyInventoryModel,
  PharmacyInventoryService,
  createPharmacyInventoryRoutes,
  pharmacyInventoryErrorHandler,
  validators,
};
