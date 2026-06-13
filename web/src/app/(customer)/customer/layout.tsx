import { AppShell } from "@/components/layout/app-shell";
import { customerNavItems } from "@/shared/config/navigation";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Customer app" navItems={customerNavItems}>
      {children}
    </AppShell>
  );
}
