const router = require("express").Router();

const orderController = require("../controllers/order.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/", asyncHandler(orderController.listMyOrders));
router.post("/", asyncHandler(orderController.createMyOrder));
router.get("/:orderId", asyncHandler(orderController.getMyOrder));
router.post("/:orderId/cancel", asyncHandler(orderController.cancelMyOrder));
router.get("/:orderId/tracking", asyncHandler(orderController.getOrderTracking));
router.get("/:orderId/timeline", asyncHandler(orderController.getOrderTimeline));
router.get("/:orderId/invoice", asyncHandler(orderController.getOrderInvoice));
router.post(
    "/:orderId/substitutions/:substitutionId/approve",
    asyncHandler(orderController.approveSubstitution)
);
router.post(
    "/:orderId/substitutions/:substitutionId/reject",
    asyncHandler(orderController.rejectSubstitution)
);

module.exports = router;
