import type { Severity, StationThresholds } from "@/types";

/**
 * Client-safe copy of the severity-tier logic from lib/alerts.ts (which
 * also pulls in firebase-admin and must stay server-only). Both
 * implementations must stay in sync — this one has no side effects and no
 * server-only imports, so it's safe to use directly in client components
 * like StationDetailView for instant local severity display.
 */
export function getSeverityTier(waterLevel: number, thresholds: StationThresholds): Severity {
  if (waterLevel >= thresholds.dangerCm) return "danger";
  if (waterLevel >= thresholds.warningCm) return "warning";
  if (waterLevel >= thresholds.watchCm) return "watch";
  return "normal";
}
