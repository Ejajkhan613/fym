import { PortalLinks } from "@/components/navigation/portal-links";
import { ModulePage } from "@/components/layout/module-page";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <ModulePage
        eyebrow="Find Your Medicines"
        title="Licensed pharmacy network operations"
        description="Web workspace for customer ordering, pharmacy acceptance, delivery tracking, and admin compliance workflows."
        metrics={[
          { label: "Backend domains", value: "15" },
          { label: "Primary portals", value: "4" },
          { label: "Realtime flows", value: "Orders" },
          { label: "Inventory", value: "Deferred" },
        ]}
        sections={[
          {
            title: "Customer flow",
            body: "Medicine search, prescription upload, cart, payment, order timeline, refunds, and support.",
            status: "Web",
          },
          {
            title: "Pharmacy flow",
            body: "Onboarding, order offers, acceptance checklist, pharmacist approval, packing, and penalties.",
            status: "Portal",
          },
          {
            title: "Admin flow",
            body: "Operational dashboards for pharmacies, medicines, prescriptions, orders, audit, analytics, and support.",
            status: "Ops",
          },
        ]}
      />
      <PortalLinks />
    </main>
  );
}
