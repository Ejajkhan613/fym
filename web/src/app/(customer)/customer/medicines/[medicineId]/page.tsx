import { ModulePage } from "@/components/layout/module-page";

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ medicineId: string }>;
}) {
  const { medicineId } = await params;

  return (
    <ModulePage
      eyebrow="Catalog"
      title={`Medicine ${medicineId}`}
      description="Medicine detail route for pack, salt, strength, prescription requirement, substitution, and safety information."
      actions={[{ label: "Back to search", href: "/customer/medicines" }]}
    />
  );
}
