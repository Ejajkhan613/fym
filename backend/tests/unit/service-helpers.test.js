const {
  calculateSummary,
} = require("../../services/order-service/src/modules/cart/cart.service");
const {
  calculatePenaltyAmount,
} = require("../../services/penalty-service/src/modules/penalties/penalty.service");
const { getServiceRegistry } = require("../../services/api-gateway/src");
const { listMigrationFiles } = require("../../packages/database/src");
const {
  SERVICE_FACTORIES,
  getServiceConfig,
} = require("../../scripts/start-service");

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

    expect(serviceNames).toContain("auth-service");
    expect(serviceNames).toContain("order-service");
    expect(serviceNames).toContain("audit-compliance-service");
    expect(serviceNames).not.toContain("inventory-service");
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
  });
});
