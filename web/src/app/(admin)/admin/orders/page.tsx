import { ModulePage } from "@/components/layout/module-page";

export default function AdminOrdersPage() {
  return (
    <ModulePage
      eyebrow="Admin"
      title="Order management"
      description="Search orders, inspect timeline, force assign vendor, cancel, refund, view vendor responses, delivery tracking, invoice, and chat history."
    />
  );
}
