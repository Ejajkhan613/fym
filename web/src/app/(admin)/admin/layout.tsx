import { AppShell } from "@/components/layout/app-shell";
import { adminNavItems } from "@/shared/config/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Admin console" navItems={adminNavItems}>
      {children}
    </AppShell>
  );
}
