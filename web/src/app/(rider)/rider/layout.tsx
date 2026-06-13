import { AppShell } from "@/components/layout/app-shell";
import { riderNavItems } from "@/shared/config/navigation";

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Rider app" navItems={riderNavItems}>
      {children}
    </AppShell>
  );
}
