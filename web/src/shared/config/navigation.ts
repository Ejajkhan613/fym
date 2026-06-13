import type { NavigationItem, PortalLink } from "@/shared/types/navigation";

export const portalLinks: PortalLink[] = [
  {
    title: "Customer",
    description: "Search medicines, upload prescriptions, track orders.",
    href: "/customer",
    tone: "primary",
  },
  {
    title: "Pharmacy",
    description: "Onboard stores, accept offers, pack compliant orders.",
    href: "/pharmacy",
    tone: "accent",
  },
  {
    title: "Admin",
    description: "Operate pharmacies, orders, compliance, and support.",
    href: "/admin",
    tone: "warning",
  },
  {
    title: "Rider",
    description: "Handle pickup, live delivery, OTP, and proof of delivery.",
    href: "/rider",
    tone: "neutral",
  },
];

export const customerNavItems: NavigationItem[] = [
  { label: "Home", href: "/customer" },
  { label: "Profile", href: "/customer/profile" },
  { label: "Medicines", href: "/customer/medicines" },
  { label: "Prescriptions", href: "/customer/prescriptions" },
  { label: "Cart", href: "/customer/cart" },
  { label: "Orders", href: "/customer/orders" },
  { label: "Support", href: "/customer/support" },
];

export const pharmacyNavItems: NavigationItem[] = [
  { label: "Dashboard", href: "/pharmacy" },
  { label: "Onboarding", href: "/pharmacy/onboarding" },
  { label: "Orders", href: "/pharmacy/orders" },
  { label: "Prescriptions", href: "/pharmacy/prescriptions" },
  { label: "Penalties", href: "/pharmacy/penalties" },
  { label: "Payouts", href: "/pharmacy/payouts" },
];

export const adminNavItems: NavigationItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Pharmacies", href: "/admin/pharmacies" },
  { label: "Medicines", href: "/admin/medicines" },
  { label: "Prescriptions", href: "/admin/prescriptions" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Penalties", href: "/admin/penalties" },
  { label: "Audit", href: "/admin/audit" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Support", href: "/admin/support" },
];

export const riderNavItems: NavigationItem[] = [
  { label: "Dashboard", href: "/rider" },
  { label: "Assignments", href: "/rider/assignments" },
];
