import { ModulePage } from "@/components/layout/module-page";

export default async function RiderAssignmentDetailPage({
  params,
}: {
  params: Promise<{ deliveryId: string }>;
}) {
  const { deliveryId } = await params;

  return (
    <ModulePage
      eyebrow="Delivery"
      title={`Assignment ${deliveryId}`}
      description="Delivery detail route for pickup checklist, package handoff, navigation, OTP verification, proof of delivery, and failure reason capture."
      actions={[{ label: "All assignments", href: "/rider/assignments" }]}
    />
  );
}
