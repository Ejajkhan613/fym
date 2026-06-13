import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type StatusTone = "neutral" | "primary" | "accent" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-border bg-surface-muted text-foreground",
  primary: "border-emerald-200 bg-emerald-50 text-emerald-800",
  accent: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
};

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
