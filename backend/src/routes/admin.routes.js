const router = require("express").Router();

const adminController = require("../controllers/admin.controller");
const deliveryController = require("../controllers/delivery.controller");
const medicineController = require("../controllers/medicine.controller");
const orderController = require("../controllers/order.controller");
const penaltyController = require("../controllers/penalty.controller");
const pharmacistController = require("../controllers/pharmacist.controller");
const pharmacyController = require("../controllers/pharmacy.controller");
const prescriptionController = require("../controllers/prescription.controller");
const supportController = require("../controllers/support.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate, requireRoles } = require("../middlewares/auth.middleware");

router.use(authenticate, requireRoles("ADMIN"));

router.get("/dashboard", asyncHandler(adminController.dashboard));

router.get("/users", asyncHandler(adminController.listAdminUsers));
router.get("/users/:userId", asyncHandler(adminController.getAdminUser));
router.patch(
    "/users/:userId/status",
    asyncHandler(adminController.updateAdminUserStatus)
);

router.get("/customers", asyncHandler(adminController.listAdminCustomers));
router.get(
    "/customers/:customerId",
    asyncHandler(adminController.getAdminCustomer)
);
router.get(
    "/customers/:customerId/orders",
    asyncHandler(adminController.listAdminCustomerOrders)
);
router.get(
    "/customers/:customerId/support-tickets",
    asyncHandler(adminController.listAdminCustomerSupportTickets)
);

router.get("/pharmacies", asyncHandler(pharmacyController.listAdminPharmacies));
router.get(
    "/pharmacies/:pharmacyId",
    asyncHandler(pharmacyController.getAdminPharmacy)
);
router.get(
    "/pharmacies/:pharmacyId/documents",
    asyncHandler(pharmacyController.listAdminPharmacyDocuments)
);
router.post(
    "/pharmacies/:pharmacyId/documents/:documentId/verify",
    asyncHandler(pharmacyController.verifyAdminPharmacyDocument)
);
router.post(
    "/pharmacies/:pharmacyId/documents/:documentId/reject",
    asyncHandler(pharmacyController.rejectAdminPharmacyDocument)
);
router.post(
    "/pharmacies/:pharmacyId/approve",
    asyncHandler(pharmacyController.approveAdminPharmacy)
);
router.post(
    "/pharmacies/:pharmacyId/reject",
    asyncHandler(pharmacyController.rejectAdminPharmacy)
);
router.post(
    "/pharmacies/:pharmacyId/suspend",
    asyncHandler(pharmacyController.suspendAdminPharmacy)
);
router.post(
    "/pharmacies/:pharmacyId/blacklist",
    asyncHandler(pharmacyController.blacklistAdminPharmacy)
);
router.patch(
    "/pharmacies/:pharmacyId/service-radius",
    asyncHandler(pharmacyController.updateAdminPharmacyServiceRadius)
);
router.get(
    "/pharmacies/:pharmacyId/orders",
    asyncHandler(pharmacyController.listAdminPharmacyOrders)
);
router.get(
    "/pharmacies/:pharmacyId/penalties",
    asyncHandler(pharmacyController.listAdminPharmacyPenalties)
);
router.get(
    "/pharmacies/:pharmacyId/audit-logs",
    asyncHandler(pharmacyController.listAdminPharmacyAuditLogs)
);

router.get("/pharmacists", asyncHandler(pharmacistController.listAdminPharmacists));
router.get(
    "/pharmacists/:pharmacistId",
    asyncHandler(pharmacistController.getAdminPharmacist)
);
router.post(
    "/pharmacists/:pharmacistId/verify",
    asyncHandler(pharmacistController.verifyAdminPharmacist)
);
router.post(
    "/pharmacists/:pharmacistId/reject",
    asyncHandler(pharmacistController.rejectAdminPharmacist)
);
router.post(
    "/pharmacists/:pharmacistId/suspend",
    asyncHandler(pharmacistController.suspendAdminPharmacist)
);

router.get("/medicines", asyncHandler(medicineController.listAdminMedicines));
router.post("/medicines", asyncHandler(medicineController.createAdminMedicine));
router.get(
    "/medicines/:medicineId",
    asyncHandler(medicineController.getAdminMedicine)
);
router.patch(
    "/medicines/:medicineId",
    asyncHandler(medicineController.updateAdminMedicine)
);
router.post(
    "/medicines/:medicineId/restrict",
    asyncHandler(medicineController.restrictAdminMedicine)
);
router.post(
    "/medicines/:medicineId/prescription-policy",
    asyncHandler(medicineController.updateAdminPrescriptionPolicy)
);
router.post(
    "/medicines/:medicineId/substitution-rules",
    asyncHandler(medicineController.updateAdminSubstitutionRules)
);
router.post(
    "/medicines/import",
    asyncHandler(medicineController.importAdminMedicines)
);

router.get("/orders", asyncHandler(orderController.listAdminOrders));
router.get("/orders/:orderId", asyncHandler(orderController.getAdminOrder));
router.post(
    "/orders/:orderId/force-assign-vendor",
    asyncHandler(orderController.forceAssignVendor)
);
router.post("/orders/:orderId/cancel", asyncHandler(orderController.cancelAdminOrder));
router.post("/orders/:orderId/refund", asyncHandler(orderController.refundAdminOrder));
router.get(
    "/orders/:orderId/timeline",
    asyncHandler(orderController.getAdminOrderTimeline)
);
router.get(
    "/orders/:orderId/vendor-responses",
    asyncHandler(orderController.listAdminOrderVendorResponses)
);
router.get(
    "/orders/:orderId/tracking",
    asyncHandler(orderController.getAdminOrderTracking)
);
router.get(
    "/orders/:orderId/invoice",
    asyncHandler(orderController.getAdminOrderInvoice)
);

router.get(
    "/prescriptions/review",
    asyncHandler(prescriptionController.listAdminPrescriptionReview)
);
router.get(
    "/prescriptions/:prescriptionId",
    asyncHandler(prescriptionController.getAdminPrescription)
);
router.post(
    "/prescriptions/:prescriptionId/approve",
    asyncHandler(prescriptionController.approveAdminPrescription)
);
router.post(
    "/prescriptions/:prescriptionId/reject",
    asyncHandler(prescriptionController.rejectAdminPrescription)
);
router.post(
    "/prescriptions/:prescriptionId/flag-fake",
    asyncHandler(prescriptionController.flagFakeAdminPrescription)
);
router.post(
    "/prescriptions/:prescriptionId/assign-pharmacist",
    asyncHandler(prescriptionController.assignAdminPrescriptionPharmacist)
);

router.get("/penalties", asyncHandler(penaltyController.listAdminPenalties));
router.post("/penalties", asyncHandler(penaltyController.createAdminPenalty));
router.get("/penalties/:penaltyId", asyncHandler(penaltyController.getAdminPenalty));
router.post(
    "/penalties/:penaltyId/waive",
    asyncHandler(penaltyController.waiveAdminPenalty)
);
router.post(
    "/penalties/:penaltyId/appeal/approve",
    asyncHandler(penaltyController.approveAdminPenaltyAppeal)
);
router.post(
    "/penalties/:penaltyId/appeal/reject",
    asyncHandler(penaltyController.rejectAdminPenaltyAppeal)
);

router.get(
    "/delivery/orders",
    asyncHandler(deliveryController.listAdminDeliveryOrders)
);
router.get("/delivery/riders", asyncHandler(deliveryController.listAdminRiders));
router.get(
    "/delivery/riders/:riderId",
    asyncHandler(deliveryController.getAdminRider)
);
router.get(
    "/delivery/orders/:orderId/proof",
    asyncHandler(deliveryController.getAdminDeliveryProof)
);

router.get("/support/tickets", asyncHandler(supportController.listAdminTickets));
router.get(
    "/support/tickets/:ticketId",
    asyncHandler(supportController.getAdminTicket)
);
router.post(
    "/support/tickets/:ticketId/messages",
    asyncHandler(supportController.createAdminTicketMessage)
);
router.post(
    "/support/tickets/:ticketId/escalate",
    asyncHandler(supportController.escalateAdminTicket)
);

router.get("/audit-logs", asyncHandler(adminController.listAdminAuditLogs));

module.exports = router;
