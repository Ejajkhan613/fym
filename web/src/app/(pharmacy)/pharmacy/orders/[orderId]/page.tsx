import { ModulePage } from "@/components/layout/module-page";

export default async function PharmacyOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <ModulePage
      eyebrow="Orders"
      title={`Vendor order ${orderId}`}
      description="Vendor order detail route for medicine list, prescription image, acceptance checklist, pharmacist approval, packing status, and cancellation reason."
      actions={[{ label: "All offers", href: "/pharmacy/orders" }]}
    />
  );
}
