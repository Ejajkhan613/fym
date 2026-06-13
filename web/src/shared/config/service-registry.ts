export const serviceRegistry = [
  {
    name: "auth-service",
    feature: "auth",
    prefixes: ["/auth"],
  },
  {
    name: "user-service",
    feature: "users",
    prefixes: ["/users", "/customers"],
  },
  {
    name: "pharmacy-service",
    feature: "pharmacies",
    prefixes: ["/pharmacies"],
  },
  {
    name: "catalog-service",
    feature: "catalog",
    prefixes: ["/medicines"],
  },
  {
    name: "prescription-service",
    feature: "prescriptions",
    prefixes: ["/prescriptions"],
  },
  {
    name: "order-service",
    feature: "orders",
    prefixes: ["/cart", "/orders", "/pharmacy/orders"],
  },
  {
    name: "matching-service",
    feature: "matching",
    prefixes: ["/matching"],
  },
  {
    name: "payment-service",
    feature: "payments",
    prefixes: ["/payments"],
  },
  {
    name: "delivery-service",
    feature: "delivery",
    prefixes: ["/deliveries", "/delivery"],
  },
  {
    name: "notification-service",
    feature: "notifications",
    prefixes: ["/notifications"],
  },
  {
    name: "support-service",
    feature: "support",
    prefixes: ["/support"],
  },
  {
    name: "penalty-service",
    feature: "penalties",
    prefixes: ["/penalties"],
  },
  {
    name: "audit-compliance-service",
    feature: "audit",
    prefixes: ["/audit"],
  },
  {
    name: "analytics-service",
    feature: "analytics",
    prefixes: ["/analytics"],
  },
  {
    name: "admin-service",
    feature: "admin",
    prefixes: ["/admin"],
  },
] as const;

export type ServiceRegistryEntry = (typeof serviceRegistry)[number];
export type ServiceName = ServiceRegistryEntry["name"];
export type FeatureKey = ServiceRegistryEntry["feature"];

export function findServiceForPath(pathname: string) {
  return (
    serviceRegistry.find((service) =>
      service.prefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
    ) ?? null
  );
}
