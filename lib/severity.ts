import type { Severity } from "@/types";

interface SeverityConfig {
  label: string;
  color: string; // Tailwind text/bg color token
  hex: string;
  description: string;
}

export const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  normal: {
    label: "Normal",
    color: "normal",
    hex: "#16A34A",
    description: "Safe water levels",
  },
  watch: {
    label: "Watch",
    color: "watch",
    hex: "#D97706",
    description: "Rising, monitor",
  },
  warning: {
    label: "Warning",
    color: "warning",
    hex: "#EA580C",
    description: "Approaching flood stage",
  },
  danger: {
    label: "Danger",
    color: "danger",
    hex: "#DC2626",
    description: "At/above flood stage — evacuate",
  },
};

export function severityRank(s: Severity): number {
  return { normal: 0, watch: 1, warning: 2, danger: 3 }[s];
}
