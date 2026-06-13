import { ModulePage } from "@/components/layout/module-page";

export default function PharmacyPenaltiesPage() {
  return (
    <ModulePage
      eyebrow="Penalties"
      title="Penalty and appeal center"
      description="Penalty history for wrongful acceptance, late cancellation, substitution violations, SLA delays, invalid invoice, and prescription issues."
      actions={[{ label: "View order offers", href: "/pharmacy/orders" }]}
    />
  );
}
