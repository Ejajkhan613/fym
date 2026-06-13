import { ModulePage } from "@/components/layout/module-page";

export default function RiderAssignmentsPage() {
  return (
    <ModulePage
      eyebrow="Delivery"
      title="Pickup and delivery queue"
      description="Assignment list for pharmacy pickup, handoff verification, route tracking, customer OTP, proof of delivery, and support escalation."
      sections={[
        {
          title: "Location stream",
          body: "Rider position should update customer and admin order tracking in realtime.",
          status: "Live",
        },
      ]}
    />
  );
}
