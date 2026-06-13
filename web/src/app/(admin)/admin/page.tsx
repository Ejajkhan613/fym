import { ModulePage } from "@/components/layout/module-page";

export default function AdminDashboardPage() {
  return (
    <ModulePage
      eyebrow="Admin"
      title="Operations dashboard"
      description="Admin console for order health, GMV, prescriptions, pharmacy performance, delivery SLA, refunds, penalties, audit, and support workload."
      metrics={[
        { label: "Orders", value: "Today" },
        { label: "Pharmacies", value: "Active" },
        { label: "Prescriptions", value: "Queue" },
        { label: "Alerts", value: "Live" },
      ]}
    />
  );
}
