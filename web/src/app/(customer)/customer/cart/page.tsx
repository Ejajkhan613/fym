import { ModulePage } from "@/components/layout/module-page";

export default function CartPage() {
  return (
    <ModulePage
      eyebrow="Orders"
      title="Cart"
      description="Cart route for selected medicines, prescription requirements, delivery address, duplicate salt warnings, and payment readiness."
      actions={[{ label: "Create order", href: "/customer/orders" }]}
    />
  );
}
