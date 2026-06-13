import Link from "next/link";
import type { ReactNode } from "react";
import type { NavigationItem } from "@/shared/types/navigation";

export function AppShell({
  children,
  navItems,
  title,
}: {
  children: ReactNode;
  navItems: NavigationItem[];
  title: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-semibold text-primary">
              FYM
            </Link>
            <span className="text-sm font-medium text-muted">{title}</span>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
