const router = require("express").Router();

const addressController = require("../controllers/address.controller");
const userController = require("../controllers/user.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/me", asyncHandler(userController.getMe));
router.patch("/me", asyncHandler(userController.updateMe));

router.get("/me/addresses", asyncHandler(addressController.listMyAddresses));
router.post("/me/addresses", asyncHandler(addressController.createMyAddress));
router.get(
    "/me/addresses/:addressId",
    asyncHandler(addressController.getMyAddress)
);
router.patch(
    "/me/addresses/:addressId",
    asyncHandler(addressController.updateMyAddress)
);
router.delete(
    "/me/addresses/:addressId",
    asyncHandler(addressController.deleteMyAddress)
);
router.post(
    "/me/addresses/:addressId/default",
    asyncHandler(addressController.setMyDefaultAddress)
);

module.exports = router;
