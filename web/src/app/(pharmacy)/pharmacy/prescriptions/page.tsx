import { ModulePage } from "@/components/layout/module-page";

export default function PharmacyPrescriptionsPage() {
  return (
    <ModulePage
      eyebrow="Prescription"
      title="Pharmacist review queue"
      description="Queue for prescription visibility, OCR review, legal dispensing approval, rejection reasons, and suspicious prescription flags."
      sections={[
        {
          title: "Human approval",
          body: "Prescription medicine dispensing requires licensed pharmacist confirmation.",
          status: "Compliance",
        },
      ]}
    />
  );
}
