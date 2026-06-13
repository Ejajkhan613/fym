import { ModulePage } from "@/components/layout/module-page";

export default function AdminPrescriptionsPage() {
  return (
    <ModulePage
      eyebrow="Admin"
      title="Prescription review"
      description="Admin review panel for OCR output, pharmacist routing, fake prescription flags, rejection reasons, and audit trails."
    />
  );
}
