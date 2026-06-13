import { ModulePage } from "@/components/layout/module-page";

export default function CustomerOrdersPage() {
  return (
    <ModulePage
      eyebrow="Orders"
      title="Order timeline"
      description="Customer order list and realtime status surface for vendor matching, pharmacist approval, packing, pickup, delivery, refunds, and disputes."
      sections={[
        {
          title: "Realtime status",
          body: "Consumes order events from the gateway Socket.IO connection.",
          status: "Live",
        },
        {
          title: "Payments",
          body: "Prescription orders can authorize first and capture after vendor/pharmacist acceptance.",
          status: "Payment",
        },
      ]}
    />
  );
}
