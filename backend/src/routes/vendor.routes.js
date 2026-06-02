const router = require("express").Router();

const inventoryController = require("../controllers/inventory.controller");
const orderController = require("../controllers/order.controller");
const penaltyController = require("../controllers/penalty.controller");
const pharmacistController = require("../controllers/pharmacist.controller");
const pharmacyController = require("../controllers/pharmacy.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/profile", asyncHandler(pharmacyController.getVendorProfile));
router.patch("/profile", asyncHandler(pharmacyController.updateVendorProfile));

router.get("/pharmacy", asyncHandler(pharmacyController.getMyPharmacy));
router.post("/pharmacy", asyncHandler(pharmacyController.createMyPharmacy));
router.patch("/pharmacy", asyncHandler(pharmacyController.updateMyPharmacy));
router.post(
    "/pharmacy/documents",
    asyncHandler(pharmacyController.uploadMyPharmacyDocument)
);
router.get(
    "/pharmacy/documents",
    asyncHandler(pharmacyController.listMyPharmacyDocuments)
);
router.post(
    "/pharmacy/submit-review",
    asyncHandler(pharmacyController.submitMyPharmacyForReview)
);

router.get("/pharmacists", asyncHandler(pharmacistController.listMyPharmacists));
router.post("/pharmacists", asyncHandler(pharmacistController.createMyPharmacist));
router.get(
    "/pharmacists/:pharmacistId",
    asyncHandler(pharmacistController.getMyPharmacist)
);
router.patch(
    "/pharmacists/:pharmacistId",
    asyncHandler(pharmacistController.updateMyPharmacist)
);

router.get("/orders", asyncHandler(orderController.listVendorOrders));
router.get("/orders/offers", asyncHandler(orderController.listVendorOrderOffers));
router.get("/orders/:orderId", asyncHandler(orderController.getVendorOrder));
router.post("/orders/:orderId/accept", asyncHandler(orderController.acceptVendorOrder));
router.post("/orders/:orderId/reject", asyncHandler(orderController.rejectVendorOrder));
router.post("/orders/:orderId/cancel", asyncHandler(orderController.cancelVendorOrder));
router.post(
    "/orders/:orderId/suggest-substitute",
    asyncHandler(orderController.suggestSubstitute)
);
router.post(
    "/orders/:orderId/mark-packed",
    asyncHandler(orderController.markVendorOrderPacked)
);

router.get("/inventory", asyncHandler(inventoryController.listMyInventory));
router.post("/inventory", asyncHandler(inventoryController.createMyInventoryItem));
router.patch(
    "/inventory/:inventoryItemId",
    asyncHandler(inventoryController.updateMyInventoryItem)
);
router.delete(
    "/inventory/:inventoryItemId",
    asyncHandler(inventoryController.deleteMyInventoryItem)
);
router.post(
    "/inventory/bulk-upload",
    asyncHandler(inventoryController.bulkUploadMyInventory)
);

router.get("/penalties", asyncHandler(penaltyController.listVendorPenalties));
router.get("/penalties/:penaltyId", asyncHandler(penaltyController.getVendorPenalty));
router.post(
    "/penalties/:penaltyId/appeal",
    asyncHandler(penaltyController.appealVendorPenalty)
);

module.exports = router;
