import { ModulePage } from "@/components/layout/module-page";

export default function RiderHomePage() {
  return (
    <ModulePage
      eyebrow="Delivery"
      title="Rider assignments"
      description="Delivery partner routes for assigned pickup, pickup OTP, package checklist, navigation, delivery OTP, proof of delivery, and failed delivery reasons."
      actions={[{ label: "Assignments", href: "/rider/assignments" }]}
      metrics={[
        { label: "Tracking", value: "Live" },
        { label: "Proof", value: "OTP" },
        { label: "COD", value: "Controlled" },
        { label: "SLA", value: "Timed" },
      ]}
    />
  );
}
