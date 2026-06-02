const router = require("express").Router();

const cartController = require("../controllers/cart.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/", asyncHandler(cartController.getCart));
router.delete("/", asyncHandler(cartController.clear));
router.post("/items", asyncHandler(cartController.addItem));
router.patch("/items/:itemId", asyncHandler(cartController.updateItem));
router.delete("/items/:itemId", asyncHandler(cartController.removeItem));

module.exports = router;
