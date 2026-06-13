import { ModulePage } from "@/components/layout/module-page";

export default function AdminAuditPage() {
  return (
    <ModulePage
      eyebrow="Admin"
      title="Compliance audit"
      description="Audit logs for prescription access, pharmacist approvals, restricted medicine attempts, invoices, license expiry, and admin actions."
    />
  );
}
