import { ModulePage } from "@/components/layout/module-page";

export default function PharmacyOrdersPage() {
  return (
    <ModulePage
      eyebrow="Orders"
      title="Vendor order offers"
      description="Realtime offer queue for nearby order broadcasts, acceptance countdowns, stock confirmation, substitution suggestions, and packing updates."
      sections={[
        {
          title: "Acceptance checklist",
          body: "Pharmacy must confirm availability, strength, expiry, prescription review, invoice readiness, and packing SLA.",
          status: "Required",
        },
        {
          title: "Atomic lock",
          body: "Only the first valid pharmacy acceptance should win the order.",
          status: "Race safe",
        },
      ]}
    />
  );
}
