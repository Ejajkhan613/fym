const { MedicineModel } = require("./medicine.model");
const { MedicineService } = require("./medicine.service");
const {
  createMedicineRoutes,
  medicineRouteErrorHandler,
} = require("./medicine.routes");
const validators = require("./medicine.validators");

module.exports = {
  MedicineModel,
  MedicineService,
  createMedicineRoutes,
  medicineRouteErrorHandler,
  validators,
};
