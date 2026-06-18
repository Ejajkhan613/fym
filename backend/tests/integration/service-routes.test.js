const request = require("supertest");

const { createApiGatewayApp } = require("../../services/api-gateway/src");
const { createAuthServiceApp } = require("../../services/auth-service/src");
const { createUserServiceApp } = require("../../services/user-service/src");
const {
  createPharmacyServiceApp,
} = require("../../services/pharmacy-service/src");
const {
  createCatalogServiceApp,
} = require("../../services/catalog-service/src");
const {
  createPrescriptionServiceApp,
} = require("../../services/prescription-service/src");
const { createOrderServiceApp } = require("../../services/order-service/src");
const {
  createMatchingServiceApp,
} = require("../../services/matching-service/src");
const {
  createPaymentServiceApp,
} = require("../../services/payment-service/src");
const {
  createDeliveryServiceApp,
} = require("../../services/delivery-service/src");
const {
  createNotificationServiceApp,
} = require("../../services/notification-service/src");
const {
  createSupportServiceApp,
} = require("../../services/support-service/src");
const {
  createPenaltyServiceApp,
} = require("../../services/penalty-service/src");
const {
  createAuditComplianceServiceApp,
} = require("../../services/audit-compliance-service/src");
const {
  createAnalyticsServiceApp,
} = require("../../services/analytics-service/src");
const { createAdminServiceApp } = require("../../services/admin-service/src");

const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("service route smoke tests", () => {
  test("api gateway exposes health and service registry", async () => {
    const app = createApiGatewayApp({
      serviceRegistry: [
        {
          name: "auth-service",
          prefixes: ["/auth"],
          url: "http://localhost:1",
        },
      ],
    });

    await request(app).get("/health").expect(200);
    const response = await request(app).get("/gateway/services").expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("auth-service");
  });

  test("auth otp routes validate and delegate", async () => {
    const app = createAuthServiceApp({
      authService: {
        requestOtp: jest.fn(async (payload) => ({
          challengeId: id,
          ...payload,
        })),
        verifyOtp: jest.fn(async () => ({
          accessToken: "access",
          refreshToken: "refresh",
        })),
        refresh: jest.fn(async () => ({ accessToken: "access" })),
        logout: jest.fn(async () => ({ revoked: true })),
        logoutAll: jest.fn(async () => ({ revoked: 2 })),
        getSessionUser: jest.fn(async () => ({ id })),
      },
    });

    await request(app)
      .post("/auth/otp/request")
      .send({ phone: "+919876543210" })
      .expect(202);
    await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "+919876543210", otp: "123456", purpose: "login" })
      .expect(200);
  });

  test("user and customer routes validate and delegate", async () => {
    const app = createUserServiceApp({
      userService: {
        createUser: jest.fn(async (payload) => ({ id, ...payload })),
        listUsers: jest.fn(async () => ({ users: [], total: 0 })),
        getUserById: jest.fn(async (userId) => ({ id: userId })),
        updateUser: jest.fn(async (userId, payload) => ({
          id: userId,
          ...payload,
        })),
        updateUserStatus: jest.fn(async (userId, status) => ({
          id: userId,
          status,
        })),
        deleteUser: jest.fn(async () => null),
      },
      customerService: {
        upsertProfile: jest.fn(async (userId, payload) => ({
          id: secondId,
          userId,
          ...payload,
        })),
        getProfile: jest.fn(async (userId) => ({ id: secondId, userId })),
        createAddress: jest.fn(async (userId, payload) => ({
          id: secondId,
          userId,
          ...payload,
        })),
        listAddresses: jest.fn(async () => []),
        getAddress: jest.fn(async (userId, addressId) => ({
          id: addressId,
          userId,
        })),
        updateAddress: jest.fn(async (userId, addressId, payload) => ({
          id: addressId,
          userId,
          ...payload,
        })),
        setDefaultAddress: jest.fn(async (userId, addressId) => ({
          id: addressId,
          userId,
          isDefault: true,
        })),
        deleteAddress: jest.fn(async () => null),
        listFamilyProfiles: jest.fn(async () => []),
        createFamilyProfile: jest.fn(async (userId, payload) => ({
          id: secondId,
          userId,
          ...payload,
        })),
        updateFamilyProfile: jest.fn(async (userId, profileId, payload) => ({
          id: profileId,
          userId,
          ...payload,
        })),
        deleteFamilyProfile: jest.fn(async () => null),
        listMedicineReminders: jest.fn(async () => []),
        createMedicineReminder: jest.fn(async (userId, payload) => ({
          id: secondId,
          userId,
          ...payload,
        })),
        updateMedicineReminder: jest.fn(
          async (userId, reminderId, payload) => ({
            id: reminderId,
            userId,
            ...payload,
          }),
        ),
        deleteMedicineReminder: jest.fn(async () => null),
        getPrivacySettings: jest.fn(async (userId) => ({
          userId,
          pushNotificationsEnabled: true,
        })),
        updatePrivacySettings: jest.fn(async (userId, payload) => ({
          userId,
          ...payload,
        })),
      },
    });

    await request(app)
      .post("/users")
      .send({ name: "Patient", phone: "+919876543210" })
      .expect(201);
    await request(app)
      .put(`/customers/${id}/profile`)
      .send({ gender: "prefer_not_to_say" })
      .expect(200);
    await request(app)
      .post(`/customers/${id}/addresses`)
      .send({
        addressLine1: "Main Road",
        city: "Guwahati",
        state: "Assam",
        pincode: "781001",
      })
      .expect(201);
    await request(app)
      .post(`/customers/${id}/family-profiles`)
      .send({ fullName: "Parent", relationship: "Mother" })
      .expect(201);
    await request(app).get(`/customers/${id}/family-profiles`).expect(200);
    await request(app)
      .patch(`/customers/${id}/family-profiles/${secondId}`)
      .send({ relationship: "Father" })
      .expect(200);
    await request(app)
      .delete(`/customers/${id}/family-profiles/${secondId}`)
      .expect(204);
    await request(app)
      .post(`/customers/${id}/medicine-reminders`)
      .send({
        medicineName: "Dolo 650",
        frequency: "Daily",
        scheduleTime: "09:00",
        startDate: "2026-06-13",
      })
      .expect(201);
    await request(app).get(`/customers/${id}/medicine-reminders`).expect(200);
    await request(app)
      .patch(`/customers/${id}/medicine-reminders/${secondId}`)
      .send({ isActive: false })
      .expect(200);
    await request(app)
      .delete(`/customers/${id}/medicine-reminders/${secondId}`)
      .expect(204);
    await request(app).get(`/customers/${id}/privacy-settings`).expect(200);
    await request(app)
      .put(`/customers/${id}/privacy-settings`)
      .send({ promotionalOffersEnabled: true })
      .expect(200);
  });

  test("pharmacy onboarding routes validate and delegate", async () => {
    const app = createPharmacyServiceApp({
      onboardingService: {
        createDraft: jest.fn(async (payload) => ({ id, ...payload })),
        listPharmacies: jest.fn(async () => ({ pharmacies: [], total: 0 })),
        getOnboardingProfile: jest.fn(async () => ({
          pharmacy: { id },
          documents: [],
          pharmacists: [],
        })),
        updateDraft: jest.fn(async (pharmacyId, payload) => ({
          id: pharmacyId,
          ...payload,
        })),
        submitForReview: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
          status: "DOCUMENT_SUBMITTED",
        })),
        addOrReplaceDocument: jest.fn(async (pharmacyId, payload) => ({
          id: secondId,
          pharmacyId,
          ...payload,
        })),
        listDocuments: jest.fn(async () => []),
        addPharmacist: jest.fn(async (pharmacyId, payload) => ({
          id: secondId,
          pharmacyId,
          ...payload,
        })),
        listPharmacists: jest.fn(async () => []),
        startReview: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
          status: "UNDER_REVIEW",
        })),
        approve: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
          status: "APPROVED",
        })),
        reject: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
          status: "REJECTED",
        })),
        suspend: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
          status: "SUSPENDED",
        })),
        blacklist: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
          status: "BLACKLISTED",
        })),
      },
      inventoryService: {
        listInventory: jest.fn(async () => ({ items: [], total: 0 })),
        createInventoryItem: jest.fn(async (pharmacyId, payload) => ({
          id: secondId,
          pharmacyId,
          ...payload,
        })),
        updateInventoryItem: jest.fn(
          async (pharmacyId, inventoryId, payload) => ({
            id: inventoryId,
            pharmacyId,
            ...payload,
          }),
        ),
        adjustInventoryQuantity: jest.fn(
          async (pharmacyId, inventoryId, payload) => ({
            id: inventoryId,
            pharmacyId,
            quantityDelta: payload.quantityDelta,
          }),
        ),
        bulkUploadInventory: jest.fn(async (pharmacyId, payload) =>
          payload.items.map((item, index) => ({
            id: index === 0 ? id : secondId,
            pharmacyId,
            ...item,
          })),
        ),
        reportStockMismatch: jest.fn(async (pharmacyId, payload) => ({
          id: secondId,
          pharmacyId,
          status: "OPEN",
          ...payload,
        })),
      },
    });

    await request(app)
      .post("/pharmacies/onboarding/drafts")
      .send({
        ownerUserId: id,
        name: "City Meds",
        licenseNumber: "DL-1",
        addressLine1: "Main Road",
        city: "Guwahati",
        state: "Assam",
        pincode: "781001",
      })
      .expect(201);
    await request(app).get(`/pharmacies/${id}/inventory`).expect(200);
    await request(app)
      .post(`/pharmacies/${id}/inventory`)
      .send({
        medicineName: "Dolo 650 Tablet",
        genericName: "Paracetamol",
        strength: "650mg",
        quantity: 25,
        batchNumber: "DOL-24",
        expiryDate: "2027-01-31",
        price: 34,
        fastMoving: true,
      })
      .expect(201);
    await request(app)
      .patch(`/pharmacies/${id}/inventory/${secondId}`)
      .send({ quantity: 20, stockConfidenceScore: 75 })
      .expect(200);
    await request(app)
      .post(`/pharmacies/${id}/inventory/${secondId}/adjust`)
      .send({ quantityDelta: -1 })
      .expect(200);
    await request(app)
      .post(`/pharmacies/${id}/inventory/bulk-upload`)
      .send({
        items: [
          {
            medicineName: "Cetirizine Tablet",
            quantity: 15,
            price: 18,
          },
        ],
      })
      .expect(201);
    await request(app)
      .post(`/pharmacies/${id}/inventory/${secondId}/mismatch-reports`)
      .send({
        medicineName: "Dolo 650 Tablet",
        expectedQuantity: 20,
        actualQuantity: 18,
        reason: "shelf_count_mismatch",
      })
      .expect(201);
  });

  test("catalog and prescription routes validate and delegate", async () => {
    const catalogApp = createCatalogServiceApp({
      medicineService: {
        searchMedicines: jest.fn(async () => ({
          medicines: [{ id }],
          total: 1,
        })),
        createMedicine: jest.fn(async (payload) => ({ id, ...payload })),
        getMedicine: jest.fn(async (medicineId) => ({ id: medicineId })),
        updateMedicine: jest.fn(async (medicineId, payload) => ({
          id: medicineId,
          ...payload,
        })),
        addSynonym: jest.fn(async (medicineId, payload) => ({
          id: secondId,
          medicineId,
          ...payload,
        })),
        listSynonyms: jest.fn(async () => []),
      },
    });
    await request(catalogApp).get("/medicines/search?q=dolo").expect(200);
    await request(catalogApp)
      .post("/medicines")
      .send({ genericName: "Paracetamol" })
      .expect(400);

    const prescriptionApp = createPrescriptionServiceApp({
      prescriptionService: {
        upload: jest.fn(async (payload) => ({ id, ...payload })),
        list: jest.fn(async () => ({ prescriptions: [], total: 0 })),
        get: jest.fn(async (prescriptionId) => ({ id: prescriptionId })),
        updateOcr: jest.fn(async (prescriptionId, payload) => ({
          id: prescriptionId,
          ...payload,
        })),
        delete: jest.fn(async (prescriptionId) => ({ id: prescriptionId })),
        markUnderReview: jest.fn(async (prescriptionId) => ({
          id: prescriptionId,
        })),
        approve: jest.fn(async (prescriptionId) => ({ id: prescriptionId })),
        reject: jest.fn(async (prescriptionId) => ({ id: prescriptionId })),
        flag: jest.fn(async (prescriptionId) => ({ id: prescriptionId })),
      },
    });
    await request(prescriptionApp)
      .post("/prescriptions/upload")
      .send({ customerId: id, fileUrl: "https://cdn.example.test/rx.jpg" })
      .expect(201);
    await request(prescriptionApp).delete(`/prescriptions/${id}`).expect(204);
  });

  test("order, cart, matching, payment, and delivery routes validate and delegate", async () => {
    const orderApp = createOrderServiceApp({
      cartService: {
        getCart: jest.fn(async () => ({
          items: [],
          summary: { itemCount: 0 },
        })),
        addItem: jest.fn(async (payload) => ({ id, ...payload })),
        updateItem: jest.fn(async (itemId, payload) => ({
          id: itemId,
          ...payload,
        })),
        removeItem: jest.fn(async () => null),
        clear: jest.fn(async () => ({ removed: 1 })),
      },
      orderService: {
        createOrder: jest.fn(async (payload) => ({
          order: { id },
          input: payload,
        })),
        listOrders: jest.fn(async () => ({ orders: [], total: 0 })),
        getOrder: jest.fn(async (orderId) => ({ id: orderId })),
        getTimeline: jest.fn(async () => []),
        cancelByCustomer: jest.fn(async (orderId) => ({ id: orderId })),
        listPharmacyOffers: jest.fn(async () => ({ offers: [], total: 0 })),
        getPharmacyOrder: jest.fn(async (orderId) => ({ id: orderId })),
        viewOffer: jest.fn(async (orderId) => ({ id: orderId })),
        acceptOffer: jest.fn(async (orderId) => ({ id: orderId })),
        rejectOffer: jest.fn(async (orderId) => ({ id: orderId })),
        markPacking: jest.fn(async (orderId) => ({ id: orderId })),
        markPacked: jest.fn(async (orderId) => ({ id: orderId })),
        cancelByPharmacy: jest.fn(async (orderId) => ({ id: orderId })),
      },
      orderModel: {
        listRealtimeEvents: jest.fn(async () => ({
          events: [
            {
              id,
              aggregateType: "order",
              aggregateId: id,
              eventName: "OrderCreated",
              channel: `customer:${id}`,
              payload: { order: { id } },
              publishedAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        })),
      },
    });
    await request(orderApp)
      .post("/cart/items")
      .send({
        customerId: id,
        requestedName: "Dolo 650",
        quantity: 2,
        unitPrice: 30,
      })
      .expect(201);
    await request(orderApp)
      .get(`/realtime/events?channel=customer:${id}`)
      .expect(200);
    await request(orderApp)
      .get("/realtime/events?channel=customer:not-a-uuid")
      .expect(400);

    const matchingApp = createMatchingServiceApp({
      matchingService: {
        selectCandidates: jest.fn(async () => [{ id: secondId }]),
        dispatch: jest.fn(async (payload) => ({
          orderId: payload.orderId,
          candidates: [],
          offers: [],
        })),
        listOffers: jest.fn(async () => ({ offers: [], total: 0 })),
      },
    });
    await request(matchingApp)
      .post("/matching/dispatch")
      .send({ orderId: id, city: "Guwahati" })
      .expect(201);

    const paymentApp = createPaymentServiceApp({
      paymentService: {
        initiate: jest.fn(async (payload) => ({ id, ...payload })),
        listForOrder: jest.fn(async () => []),
        listForCustomer: jest.fn(async () => ({ payments: [], refunds: [] })),
        get: jest.fn(async (paymentId) => ({ id: paymentId })),
        authorize: jest.fn(async (paymentId) => ({ id: paymentId })),
        capture: jest.fn(async (paymentId) => ({ id: paymentId })),
        fail: jest.fn(async (paymentId) => ({ id: paymentId })),
        createRefund: jest.fn(async (paymentId) => ({
          id: secondId,
          paymentTransactionId: paymentId,
        })),
        updateRefundStatus: jest.fn(async (refundId) => ({ id: refundId })),
      },
    });
    await request(paymentApp)
      .post("/payments/initiate")
      .send({
        orderId: id,
        customerId: secondId,
        provider: "razorpay",
        paymentMethod: "upi",
        amount: 100,
      })
      .expect(201);
    await request(paymentApp).get(`/payments/customer/${secondId}`).expect(200);

    const deliveryApp = createDeliveryServiceApp({
      deliveryService: {
        assign: jest.fn(async (payload) => ({ id, ...payload })),
        list: jest.fn(async () => ({ assignments: [], total: 0 })),
        get: jest.fn(async (assignmentId) => ({ id: assignmentId })),
        markPickedUp: jest.fn(async (assignmentId) => ({ id: assignmentId })),
        markOutForDelivery: jest.fn(async (assignmentId) => ({
          id: assignmentId,
        })),
        failDelivery: jest.fn(async (assignmentId) => ({ id: assignmentId })),
        addTrackingEvent: jest.fn(async (assignmentId) => ({
          id: secondId,
          assignmentId,
        })),
        listTrackingEvents: jest.fn(async () => []),
        createProofOfDelivery: jest.fn(async (assignmentId) => ({
          id: assignmentId,
        })),
      },
    });
    await request(deliveryApp)
      .post("/deliveries/assignments")
      .send({ orderId: id })
      .expect(201);
  });

  test("notification, support, penalty, audit, analytics, and admin routes validate and delegate", async () => {
    const notificationApp = createNotificationServiceApp({
      notificationService: {
        queue: jest.fn(async (payload) => ({ id, ...payload })),
        list: jest.fn(async () => ({ notifications: [], total: 0 })),
        get: jest.fn(async (notificationId) => ({ id: notificationId })),
        markSent: jest.fn(async (notificationId) => ({
          id: notificationId,
          status: "SENT",
        })),
        markFailed: jest.fn(async (notificationId) => ({
          id: notificationId,
          status: "FAILED",
        })),
        cancel: jest.fn(async (notificationId) => ({
          id: notificationId,
          status: "CANCELLED",
        })),
      },
    });
    await request(notificationApp)
      .post("/notifications")
      .send({
        channel: "sms",
        templateKey: "order.created",
        body: "Order created",
      })
      .expect(201);

    const supportApp = createSupportServiceApp({
      supportService: {
        createTicket: jest.fn(async (payload) => ({
          ticket: { id, ...payload },
          messages: [],
        })),
        listTickets: jest.fn(async () => ({ tickets: [], total: 0 })),
        getTicket: jest.fn(async (ticketId) => ({
          ticket: { id: ticketId },
          messages: [],
        })),
        updateTicket: jest.fn(async (ticketId, payload) => ({
          id: ticketId,
          ...payload,
        })),
        addMessage: jest.fn(async (ticketId, payload) => ({
          id: secondId,
          ticketId,
          ...payload,
        })),
      },
    });
    await request(supportApp)
      .post("/support/tickets")
      .send({
        customerId: id,
        category: "order",
        subject: "Need help",
        description: "Package delayed",
      })
      .expect(201);

    const penaltyApp = createPenaltyServiceApp({
      penaltyService: {
        create: jest.fn(async (payload) => ({ id, ...payload })),
        list: jest.fn(async () => ({ penalties: [], total: 0 })),
        get: jest.fn(async (penaltyId) => ({ id: penaltyId })),
        waive: jest.fn(async (penaltyId) => ({
          id: penaltyId,
          status: "waived",
        })),
        markPaid: jest.fn(async (penaltyId) => ({
          id: penaltyId,
          status: "paid",
        })),
        appeal: jest.fn(async (penaltyId, payload) => ({
          id: secondId,
          penaltyId,
          ...payload,
        })),
        listAppeals: jest.fn(async () => ({ appeals: [], total: 0 })),
        reviewAppeal: jest.fn(async (appealId, payload) => ({
          id: appealId,
          ...payload,
        })),
      },
    });
    await request(penaltyApp)
      .post("/penalties")
      .send({
        pharmacyId: id,
        penaltyType: "late_cancellation",
        reason: "Late cancellation",
      })
      .expect(201);

    const auditApp = createAuditComplianceServiceApp({
      complianceService: {
        listAuditLogs: jest.fn(async () => ({ logs: [], total: 0 })),
        logPrescriptionAccess: jest.fn(async (payload) => ({ id, ...payload })),
        listPrescriptionAccess: jest.fn(async () => ({ logs: [], total: 0 })),
        listLicenseAlerts: jest.fn(async () => []),
        createRegulatoryReport: jest.fn(async (payload) => ({
          id,
          ...payload,
        })),
        listRegulatoryReports: jest.fn(async () => ({ reports: [], total: 0 })),
        updateRegulatoryReport: jest.fn(async (reportId, payload) => ({
          id: reportId,
          ...payload,
        })),
      },
    });
    await request(auditApp)
      .post("/audit/prescription-access")
      .send({
        prescriptionId: id,
        actorType: "admin",
        accessReason: "Compliance review",
      })
      .expect(201);

    const analyticsApp = createAnalyticsServiceApp({
      analyticsService: {
        getOverview: jest.fn(async () => ({})),
        getBusinessMetrics: jest.fn(async () => ({})),
        getOperationsMetrics: jest.fn(async () => ({})),
        getComplianceMetrics: jest.fn(async () => ({})),
      },
    });
    await request(analyticsApp).get("/analytics/overview").expect(200);

    const adminApp = createAdminServiceApp({
      adminService: {
        getDashboard: jest.fn(async () => ({})),
        listUsers: jest.fn(async () => ({ users: [], total: 0 })),
        getUser: jest.fn(async (userId) => ({ id: userId })),
        updateUserStatus: jest.fn(async (userId) => ({ id: userId })),
        listPharmacies: jest.fn(async () => ({ pharmacies: [], total: 0 })),
        getPharmacyProfile: jest.fn(async (pharmacyId) => ({
          pharmacy: { id: pharmacyId },
        })),
        startPharmacyReview: jest.fn(async (pharmacyId) => ({
          id: pharmacyId,
        })),
        approvePharmacy: jest.fn(async (pharmacyId) => ({ id: pharmacyId })),
        rejectPharmacy: jest.fn(async (pharmacyId) => ({ id: pharmacyId })),
        suspendPharmacy: jest.fn(async (pharmacyId) => ({ id: pharmacyId })),
        blacklistPharmacy: jest.fn(async (pharmacyId) => ({ id: pharmacyId })),
        listAuditLogs: jest.fn(async () => ({ logs: [], total: 0 })),
      },
    });
    await request(adminApp).get("/admin/dashboard").expect(200);
  });
});
