import { ModulePage } from "@/components/layout/module-page";

export default function PharmacyOnboardingPage() {
  return (
    <ModulePage
      eyebrow="Onboarding"
      title="Pharmacy verification"
      description="Document and compliance checklist for drug license, GST, owner KYC, pharmacist certificate, bank account, location, and agreements."
      sections={[
        {
          title: "Document states",
          body: "DRAFT, DOCUMENT_SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED, and BLACKLISTED.",
          status: "State",
        },
        {
          title: "Location",
          body: "Store address and geo-location are required for service-radius matching.",
          status: "PostGIS",
        },
        {
          title: "Compliance",
          body: "Prescription declaration and pharmacist details are required before live order offers.",
          status: "Required",
        },
      ]}
    />
  );
}
