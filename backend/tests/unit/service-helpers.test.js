const {
  calculateSummary,
} = require("../../services/order-service/src/modules/cart/cart.service");
const {
  OrderService,
} = require("../../services/order-service/src/modules/orders/order.service");
const {
  calculatePenaltyAmount,
} = require("../../services/penalty-service/src/modules/penalties/penalty.service");
const { getServiceRegistry } = require("../../services/api-gateway/src");
const { listMigrationFiles } = require("../../packages/database/src");
const {
  SERVICE_FACTORIES,
  getServiceConfig,
} = require("../../scripts/start-service");

const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("service helper functions", () => {
  test("calculateSummary totals cart items", () => {
    expect(
      calculateSummary([
        { quantity: 2, lineTotal: 20, requiresPrescription: false },
        { quantity: 1, lineTotal: 15.5, requiresPrescription: true },
      ]),
    ).toEqual({
      itemCount: 2,
      quantity: 3,
      subtotal: 35.5,
      requiresPrescription: true,
    });
  });

  test("calculatePenaltyAmount applies repeat multiplier", () => {
    expect(
      calculatePenaltyAmount({
        baseAmount: 50,
        customerInconvenienceFee: 100,
        deliveryLossFee: 40,
        platformSlaFee: 10,
        repeatMultiplier: 1.5,
      }),
    ).toBe(300);
  });

  test("getServiceRegistry exposes all non-inventory service routes", () => {
    const registry = getServiceRegistry({});
    const serviceNames = registry.map((service) => service.name);
    const orderService = registry.find(
      (service) => service.name === "order-service",
    );

    expect(serviceNames).toContain("auth-service");
    expect(serviceNames).toContain("order-service");
    expect(serviceNames).toContain("audit-compliance-service");
    expect(serviceNames).not.toContain("inventory-service");
    expect(orderService.prefixes).toContain("/realtime");
  });

  test("migration files are ordered and include the completion migration", () => {
    const migrations = listMigrationFiles();

    expect(migrations).toEqual([...migrations].sort());
    expect(migrations).toContain("009_create_backend_completion_tables.sql");
  });

  test("service launcher knows all implemented services", () => {
    expect(Object.keys(SERVICE_FACTORIES).sort()).toEqual([
      "admin",
      "analytics",
      "api-gateway",
      "audit",
      "auth",
      "catalog",
      "delivery",
      "matching",
      "notification",
      "order",
      "payment",
      "penalty",
      "pharmacy",
      "prescription",
      "support",
      "user",
    ]);

    expect(getServiceConfig("inventory")).toBeNull();
    expect(getServiceConfig("order").factory).toBe("createOrderServiceApp");
    expect(getServiceConfig("order").serverFactory).toBe(
      "createOrderServiceServer",
    );
  });

  test("order service publishes durable offer lifecycle events", async () => {
    const acceptedEvent = {
      id,
      eventName: "VendorAccepted",
      channel: `pharmacy:${secondId}`,
      payload: { offer: { id } },
    };
    const closedEvent = {
      id: secondId,
      eventName: "VendorOfferClosed",
      channel: `pharmacy:${id}`,
      payload: { offer: { id: secondId } },
    };
    const viewedEvent = {
      id,
      eventName: "VendorOfferViewed",
      channel: `pharmacy:${secondId}`,
      payload: { offer: { id } },
    };
    const rejectedEvent = {
      id: secondId,
      eventName: "VendorRejected",
      channel: `pharmacy:${secondId}`,
      payload: { offer: { id } },
    };
    const orderModel = {
      markOfferViewed: jest.fn(async () => ({
        offer: { id },
        realtimeEvents: [viewedEvent],
      })),
      acceptOffer: jest.fn(async () => ({
        outcome: "ACCEPTED",
        order: { id },
        offer: { id },
        realtimeEvents: [acceptedEvent, closedEvent],
      })),
      rejectOffer: jest.fn(async () => ({
        offer: { id },
        realtimeEvents: [rejectedEvent],
      })),
    };
    const realtimePublisher = {
      publish: jest.fn(),
    };
    const orderService = new OrderService({ orderModel, realtimePublisher });

    await expect(orderService.viewOffer(id, secondId)).resolves.toEqual({ id });
    await expect(
      orderService.acceptOffer(id, {
        pharmacyId: secondId,
        stockConfirmed: true,
        expiryConfirmed: true,
        pharmacistVerified: true,
        packingTimeMinutes: 20,
      }),
    ).resolves.toEqual({ order: { id }, offer: { id } });
    await expect(
      orderService.rejectOffer(id, {
        pharmacyId: secondId,
        reason: "No stock",
      }),
    ).resolves.toEqual({ id });

    expect(realtimePublisher.publish).toHaveBeenCalledWith(viewedEvent);
    expect(realtimePublisher.publish).toHaveBeenCalledWith(acceptedEvent);
    expect(realtimePublisher.publish).toHaveBeenCalledWith(closedEvent);
    expect(realtimePublisher.publish).toHaveBeenCalledWith(rejectedEvent);
  });

  test("order service expires stale offers before returning pharmacy offers", async () => {
    const expiredEvent = {
      id,
      eventName: "VendorOfferExpired",
      channel: `pharmacy:${secondId}`,
      payload: { offer: { id } },
    };
    const orderModel = {
      expirePharmacyOffers: jest.fn(async () => ({
        offers: [{ id }],
        realtimeEvents: [expiredEvent],
      })),
      listPharmacyOffers: jest.fn(async () => ({ offers: [], total: 0 })),
    };
    const realtimePublisher = {
      publish: jest.fn(),
    };
    const orderService = new OrderService({ orderModel, realtimePublisher });

    await expect(
      orderService.listPharmacyOffers({ pharmacyId: secondId }),
    ).resolves.toEqual({ offers: [], total: 0 });

    expect(orderModel.expirePharmacyOffers).toHaveBeenCalledWith(secondId);
    expect(realtimePublisher.publish).toHaveBeenCalledWith(expiredEvent);
  });
});
