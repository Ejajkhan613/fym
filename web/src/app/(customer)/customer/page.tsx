import { ModulePage } from "@/components/layout/module-page";

export default function CustomerHomePage() {
  return (
    <ModulePage
      eyebrow="Customer"
      title="Medicine ordering workspace"
      description="Customer routes for search, prescription upload, cart, realtime matching, payment, delivery tracking, and support."
      actions={[
        { label: "Find medicines", href: "/customer/medicines" },
        { label: "Upload prescription", href: "/customer/prescriptions" },
      ]}
      metrics={[
        { label: "Order path", value: "Search" },
        { label: "Auth", value: "OTP" },
        { label: "Tracking", value: "Live" },
        { label: "Support", value: "Ticket" },
      ]}
    />
  );
}
