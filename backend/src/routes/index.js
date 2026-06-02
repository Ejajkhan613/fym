const router = require("express").Router();

const adminRoutes = require("./admin.routes");
const authRoutes = require("./auth.routes");
const cartRoutes = require("./cart.routes");
const customersRoutes = require("./customers.routes");
const deliveryRoutes = require("./delivery.routes");
const healthRoutes = require("./health.routes");
const medicinesRoutes = require("./medicines.routes");
const notificationsRoutes = require("./notifications.routes");
const ordersRoutes = require("./orders.routes");
const paymentsRoutes = require("./payments.routes");
const prescriptionsRoutes = require("./prescriptions.routes");
const supportRoutes = require("./support.routes");
const vendorRoutes = require("./vendor.routes");

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/cart", cartRoutes);
router.use("/customers", customersRoutes);
router.use("/delivery", deliveryRoutes);
router.use("/health", healthRoutes);
router.use("/medicines", medicinesRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/orders", ordersRoutes);
router.use("/payments", paymentsRoutes);
router.use("/prescriptions", prescriptionsRoutes);
router.use("/support", supportRoutes);
router.use("/vendor", vendorRoutes);

module.exports = router;
