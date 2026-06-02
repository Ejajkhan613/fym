const router = require("express").Router();

const prescriptionController = require("../controllers/prescription.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/", asyncHandler(prescriptionController.listMyPrescriptions));
router.post("/upload", asyncHandler(prescriptionController.uploadPrescription));
router.get("/:prescriptionId", asyncHandler(prescriptionController.getMyPrescription));
router.get(
    "/:prescriptionId/status",
    asyncHandler(prescriptionController.getMyPrescriptionStatus)
);

module.exports = router;
