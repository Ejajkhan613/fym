import type { ServiceName } from "@/shared/config/service-registry";

export type FrontendSurface = "public" | "customer" | "pharmacy" | "rider" | "admin";

export type FrontendFeatureDefinition = {
  service: ServiceName;
  gatewayPrefixes: string[];
  surfaces: FrontendSurface[];
};

export const frontendFeatures = {
  auth: {
    service: "auth-service",
    gatewayPrefixes: ["/auth"],
    surfaces: ["public", "customer", "pharmacy", "rider", "admin"],
  },
  users: {
    service: "user-service",
    gatewayPrefixes: ["/users"],
    surfaces: ["customer", "pharmacy", "rider", "admin"],
  },
  customers: {
    service: "user-service",
    gatewayPrefixes: ["/customers"],
    surfaces: ["customer", "admin"],
  },
  pharmacies: {
    service: "pharmacy-service",
    gatewayPrefixes: ["/pharmacies"],
    surfaces: ["pharmacy", "admin"],
  },
  catalog: {
    service: "catalog-service",
    gatewayPrefixes: ["/medicines"],
    surfaces: ["customer", "pharmacy", "admin"],
  },
  prescriptions: {
    service: "prescription-service",
    gatewayPrefixes: ["/prescriptions"],
    surfaces: ["customer", "pharmacy", "admin"],
  },
  cart: {
    service: "order-service",
    gatewayPrefixes: ["/cart"],
    surfaces: ["customer"],
  },
  orders: {
    service: "order-service",
    gatewayPrefixes: ["/orders", "/pharmacy/orders"],
    surfaces: ["customer", "pharmacy", "admin"],
  },
  matching: {
    service: "matching-service",
    gatewayPrefixes: ["/matching"],
    surfaces: ["pharmacy", "admin"],
  },
  payments: {
    service: "payment-service",
    gatewayPrefixes: ["/payments"],
    surfaces: ["customer", "admin"],
  },
  delivery: {
    service: "delivery-service",
    gatewayPrefixes: ["/deliveries", "/delivery"],
    surfaces: ["customer", "rider", "admin"],
  },
  notifications: {
    service: "notification-service",
    gatewayPrefixes: ["/notifications"],
    surfaces: ["customer", "pharmacy", "rider", "admin"],
  },
  support: {
    service: "support-service",
    gatewayPrefixes: ["/support"],
    surfaces: ["customer", "pharmacy", "rider", "admin"],
  },
  penalties: {
    service: "penalty-service",
    gatewayPrefixes: ["/penalties"],
    surfaces: ["pharmacy", "admin"],
  },
  audit: {
    service: "audit-compliance-service",
    gatewayPrefixes: ["/audit"],
    surfaces: ["admin"],
  },
  analytics: {
    service: "analytics-service",
    gatewayPrefixes: ["/analytics"],
    surfaces: ["admin"],
  },
  admin: {
    service: "admin-service",
    gatewayPrefixes: ["/admin"],
    surfaces: ["admin"],
  },
} as const satisfies Record<string, FrontendFeatureDefinition>;

export type FrontendFeatureKey = keyof typeof frontendFeatures;
