import { ModulePage } from "@/components/layout/module-page";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <ModulePage
      eyebrow="Orders"
      title={`Order ${orderId}`}
      description="Order detail route for item list, vendor acceptance, payment state, rider tracking, cancellation, refund, and support handoff."
      actions={[{ label: "All orders", href: "/customer/orders" }]}
    />
  );
}
