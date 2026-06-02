const router = require("express").Router();

const deliveryController = require("../controllers/delivery.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/orders/:orderId", asyncHandler(deliveryController.getDeliveryOrder));
router.post(
    "/orders/:orderId/assign-rider",
    asyncHandler(deliveryController.assignRider)
);
router.post(
    "/orders/:orderId/mark-picked-up",
    asyncHandler(deliveryController.markPickedUp)
);
router.post(
    "/orders/:orderId/mark-delivered",
    asyncHandler(deliveryController.markDelivered)
);
router.post(
    "/orders/:orderId/failed-attempt",
    asyncHandler(deliveryController.markFailedAttempt)
);
router.post(
    "/orders/:orderId/proof",
    asyncHandler(deliveryController.uploadProof)
);
router.post(
    "/riders/:riderId/location",
    asyncHandler(deliveryController.updateRiderGps)
);

module.exports = router;
