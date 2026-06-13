import { ModulePage } from "@/components/layout/module-page";

export default function AdminPharmaciesPage() {
  return (
    <ModulePage
      eyebrow="Admin"
      title="Pharmacy management"
      description="Approve, reject, suspend, audit, score, and review documents for licensed pharmacies and registered pharmacists."
      sections={[
        {
          title: "Service radius",
          body: "Admin can tune pharmacy radius and eligibility for dispatch waves.",
          status: "Geo",
        },
        {
          title: "Trust score",
          body: "Ranking depends on acceptance accuracy, cancellation rate, SLA, compliance, rating, disputes, refunds, and audit score.",
          status: "Score",
        },
      ]}
    />
  );
}
