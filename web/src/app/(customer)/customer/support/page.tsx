import { ModulePage } from "@/components/layout/module-page";

export default function CustomerSupportPage() {
  return (
    <ModulePage
      eyebrow="Support"
      title="Customer support"
      description="Ticket and chat surface for order issues, refunds, medicine safety escalation, and prescription handling questions."
      sections={[
        {
          title: "Ticket API",
          body: "Backed by the support service through the gateway /support prefix.",
          status: "/support",
        },
      ]}
    />
  );
}
