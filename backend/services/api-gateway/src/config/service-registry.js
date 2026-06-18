const dotenv = require("dotenv");

dotenv.config({ quiet: true });

function getServiceRegistry(env = process.env) {
  return [
    {
      name: "auth-service",
      prefixes: ["/auth"],
      url: env.AUTH_SERVICE_URL || "http://localhost:4101",
    },
    {
      name: "user-service",
      prefixes: ["/users", "/customers"],
      url: env.USER_SERVICE_URL || "http://localhost:4102",
    },
    {
      name: "pharmacy-service",
      prefixes: ["/pharmacies"],
      url: env.PHARMACY_SERVICE_URL || "http://localhost:4103",
    },
    {
      name: "catalog-service",
      prefixes: ["/medicines"],
      url: env.CATALOG_SERVICE_URL || "http://localhost:4104",
    },
    {
      name: "prescription-service",
      prefixes: ["/prescriptions"],
      url: env.PRESCRIPTION_SERVICE_URL || "http://localhost:4105",
    },
    {
      name: "order-service",
      prefixes: ["/cart", "/orders", "/pharmacy/orders", "/realtime"],
      url: env.ORDER_SERVICE_URL || "http://localhost:4106",
    },
    {
      name: "matching-service",
      prefixes: ["/matching"],
      url: env.MATCHING_SERVICE_URL || "http://localhost:4107",
    },
    {
      name: "payment-service",
      prefixes: ["/payments"],
      url: env.PAYMENT_SERVICE_URL || "http://localhost:4108",
    },
    {
      name: "delivery-service",
      prefixes: ["/deliveries", "/delivery"],
      url: env.DELIVERY_SERVICE_URL || "http://localhost:4109",
    },
    {
      name: "notification-service",
      prefixes: ["/notifications"],
      url: env.NOTIFICATION_SERVICE_URL || "http://localhost:4110",
    },
    {
      name: "support-service",
      prefixes: ["/support"],
      url: env.SUPPORT_SERVICE_URL || "http://localhost:4111",
    },
    {
      name: "penalty-service",
      prefixes: ["/penalties"],
      url: env.PENALTY_SERVICE_URL || "http://localhost:4112",
    },
    {
      name: "audit-compliance-service",
      prefixes: ["/audit"],
      url: env.AUDIT_COMPLIANCE_SERVICE_URL || "http://localhost:4113",
    },
    {
      name: "analytics-service",
      prefixes: ["/analytics"],
      url: env.ANALYTICS_SERVICE_URL || "http://localhost:4114",
    },
    {
      name: "admin-service",
      prefixes: ["/admin"],
      url: env.ADMIN_SERVICE_URL || "http://localhost:4115",
    },
  ];
}

module.exports = {
  getServiceRegistry,
};
