import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { portalLinks } from "@/shared/config/navigation";

const icons: Record<string, LucideIcon> = {
  Admin: ShieldCheck,
  Customer: ShoppingCart,
  Pharmacy: Building2,
  Rider: Truck,
};

export function PortalLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {portalLinks.map((portal) => {
        const Icon = icons[portal.title] ?? ShoppingCart;

        return (
          <Link
            key={portal.href}
            href={portal.href}
            className="group rounded-lg border border-border bg-surface p-4 shadow-sm transition hover:border-primary"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-md border border-border bg-surface-muted p-2 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowRight
                className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              {portal.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {portal.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
