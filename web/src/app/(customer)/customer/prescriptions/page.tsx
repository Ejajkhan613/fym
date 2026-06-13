import { ModulePage } from "@/components/layout/module-page";

export default function PrescriptionsPage() {
  return (
    <ModulePage
      eyebrow="Prescription"
      title="Prescription upload and vault"
      description="Upload images or PDFs, review OCR extraction, track verification, and reuse valid prescriptions where policy allows."
      sections={[
        {
          title: "OCR assist",
          body: "AI can extract candidate medicines, but pharmacist verification remains part of the compliance flow.",
          status: "Review",
        },
        {
          title: "Access control",
          body: "Prescription images should be visible only to assigned pharmacy, pharmacist, admin, support, or auditor roles.",
          status: "Audit",
        },
      ]}
    />
  );
}
