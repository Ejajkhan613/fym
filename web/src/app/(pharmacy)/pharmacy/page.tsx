import { ModulePage } from "@/components/layout/module-page";

export default function PharmacyHomePage() {
  return (
    <ModulePage
      eyebrow="Pharmacy"
      title="Vendor operations"
      description="Portal routes for licensed pharmacy onboarding, order offers, pharmacist approval, packing, payouts, and penalty workflows."
      actions={[
        { label: "Review offers", href: "/pharmacy/orders" },
        { label: "Onboarding", href: "/pharmacy/onboarding" },
      ]}
      metrics={[
        { label: "Offers", value: "Realtime" },
        { label: "Stock", value: "Manual" },
        { label: "Compliance", value: "Required" },
        { label: "Trust", value: "Score" },
      ]}
    />
  );
}
