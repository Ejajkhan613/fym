import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { StatusPill } from "@/shared/ui/status-pill";

type ModuleMetric = {
  label: string;
  value: string;
};

type ModuleSection = {
  title: string;
  body: string;
  status?: string;
};

type ModuleAction = {
  label: string;
  href: string;
};

export function ModulePage({
  actions = [],
  description,
  eyebrow,
  metrics = [],
  sections = [],
  title,
}: {
  actions?: ModuleAction[];
  description: ReactNode;
  eyebrow: string;
  metrics?: ModuleMetric[];
  sections?: ModuleSection[];
  title: string;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <StatusPill tone="primary">{eyebrow}</StatusPill>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="text-sm leading-6 text-muted sm:text-base">
                {description}
              </p>
            </div>
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-emerald-700"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {metrics.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <p className="text-sm text-muted">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {metric.value}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {sections.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  {section.title}
                </h2>
                {section.status ? (
                  <StatusPill tone="neutral">{section.status}</StatusPill>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {section.body}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
