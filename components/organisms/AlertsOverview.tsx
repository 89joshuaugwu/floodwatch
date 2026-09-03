"use client";

import { useMemo, useState } from "react";
import { AlertRow } from "@/components/molecules/AlertRow";
import type { Alert, Severity } from "@/types";

interface Props {
  alerts: Alert[];
  stationOptions: { id: string; name: string }[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

type StatusFilter = "all" | "active" | "resolved";

export function AlertsOverview({ alerts, stationOptions, onAcknowledge, onResolve }: Props) {
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (stationFilter !== "all" && a.stationId !== stationFilter) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (statusFilter === "active" && a.resolvedAt !== null) return false;
      if (statusFilter === "resolved" && a.resolvedAt === null) return false;
      return true;
    });
  }, [alerts, stationFilter, severityFilter, statusFilter]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm min-h-12"
        >
          <option value="all">All stations</option>
          {stationOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as Severity | "all")}
          className="rounded-lg border border-border px-3 py-2 text-sm min-h-12"
        >
          <option value="all">All severities</option>
          <option value="watch">Watch</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-border px-3 py-2 text-sm min-h-12"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary py-6">No alerts triggered — all stations normal</p>
      ) : (
        <div>
          {filtered.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onAcknowledge={onAcknowledge} onResolve={onResolve} />
          ))}
        </div>
      )}
    </div>
  );
}
