const router = require("express").Router();

const medicineController = require("../controllers/medicine.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");

router.get("/search", asyncHandler(medicineController.searchPublicMedicines));
router.get("/:medicineId", asyncHandler(medicineController.getPublicMedicine));

module.exports = router;
