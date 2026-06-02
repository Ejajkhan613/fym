const router = require("express").Router();

const authController = require("../controllers/auth.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");

router.post("/login", asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.post("/otp/request", asyncHandler(authController.requestOtp));
router.post("/otp/verify", asyncHandler(authController.verifyOtp));
router.post("/refresh-token", asyncHandler(authController.refreshToken));

module.exports = router;
