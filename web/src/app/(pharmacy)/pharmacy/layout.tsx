import { AppShell } from "@/components/layout/app-shell";
import { pharmacyNavItems } from "@/shared/config/navigation";

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Pharmacy portal" navItems={pharmacyNavItems}>
      {children}
    </AppShell>
  );
}
