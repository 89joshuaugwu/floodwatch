import { SEVERITY_CONFIG } from "@/lib/severity";
import type { Severity } from "@/types";
import { AlertTriangle, CheckCircle2, TrendingUp, Siren } from "lucide-react";

const SEVERITY_ICON: Record<Severity, typeof CheckCircle2> = {
  normal: CheckCircle2,
  watch: TrendingUp,
  warning: AlertTriangle,
  danger: Siren,
};

const SEVERITY_STYLES: Record<Severity, string> = {
  normal: "bg-green-50 text-normal border-green-200",
  watch: "bg-amber-50 text-watch border-amber-200",
  warning: "bg-orange-50 text-warning border-orange-200",
  danger: "bg-red-50 text-danger border-red-200",
};

export function SeverityBadge({ severity, size = "md" }: { severity: Severity; size?: "sm" | "md" }) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = SEVERITY_ICON[severity];
  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${SEVERITY_STYLES[severity]} ${
        isSmall ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <Icon size={isSmall ? 12 : 14} aria-hidden="true" />
      {/* Text label is always rendered alongside the icon/color — never
          color-only — so color-blind users can still distinguish tiers. */}
      {config.label}
    </span>
  );
}
