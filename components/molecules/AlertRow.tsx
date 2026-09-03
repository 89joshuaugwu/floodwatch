import { SeverityBadge } from "@/components/ui/SeverityBadge";
import type { Alert } from "@/types";

const CAUSE_LABEL: Record<Alert["cause"], string> = {
  threshold: "Threshold crossed",
  rising_trend: "Rapid rise detected",
};

export function AlertRow({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
}) {
  const isActive = alert.resolvedAt === null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <SeverityBadge severity={alert.severity} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{alert.stationName}</p>
          <p className="text-xs text-text-secondary font-mono-data">
            {new Date(alert.triggeredAt).toLocaleString()} · {CAUSE_LABEL[alert.cause]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isActive && <span className="text-xs text-text-secondary">Resolved</span>}
        {isActive && alert.acknowledgedBy && (
          <span className="text-xs text-text-secondary">Acknowledged</span>
        )}
        {isActive && onAcknowledge && !alert.acknowledgedBy && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="text-xs font-medium text-primary hover:underline min-h-8"
          >
            Acknowledge
          </button>
        )}
        {isActive && onResolve && (
          <button
            onClick={() => onResolve(alert.id)}
            className="text-xs font-medium text-normal hover:underline min-h-8"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
