const router = require("express").Router();

const notificationController = require("../controllers/notification.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/", asyncHandler(notificationController.listMyNotifications));
router.patch(
    "/:notificationId/read",
    asyncHandler(notificationController.markMyNotificationRead)
);
router.post("/devices", asyncHandler(notificationController.registerMyDevice));
router.delete(
    "/devices/:deviceId",
    asyncHandler(notificationController.unregisterMyDevice)
);

module.exports = router;
