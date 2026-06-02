const router = require("express").Router();

const paymentController = require("../controllers/payment.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.post(
    "/webhooks/provider",
    asyncHandler(paymentController.providerWebhook)
);

router.use(authenticate);

router.post("/orders/:orderId/initiate", asyncHandler(paymentController.initiatePayment));
router.post(
    "/orders/:orderId/authorize",
    asyncHandler(paymentController.authorizePayment)
);
router.post("/orders/:orderId/capture", asyncHandler(paymentController.capturePayment));
router.post("/orders/:orderId/refund", asyncHandler(paymentController.refundPayment));

module.exports = router;
