"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shells/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Spinner } from "@/components/ui/Spinner";
import { useRequireRole } from "@/lib/useRequireRole";
import { watchStationsWithLatestReadings } from "@/lib/stations";
import type { StationWithLatestReading } from "@/types";
import { Plus, Settings } from "lucide-react";

export default function AdminStationsPage() {
  const { loading } = useRequireRole("admin");
  const [stations, setStations] = useState<StationWithLatestReading[] | null>(null);

  useEffect(() => {
    return watchStationsWithLatestReadings(setStations);
  }, []);

  if (loading) {
    return (
      <AppShell role="admin">
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Stations</h1>
        <Link href="/admin/stations/new">
          <Button>
            <Plus size={18} /> New station
          </Button>
        </Link>
      </div>

      {stations === null ? (
        <Spinner />
      ) : stations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-text-secondary">No monitoring stations configured yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {stations.map((station) => (
            <Card key={station.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{station.name}</p>
                <p className="text-sm text-text-secondary">{station.riverName}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <SeverityBadge severity={station.severity} size="sm" />
                <Link
                  href={`/admin/stations/${station.id}/thresholds`}
                  className="p-2.5 rounded-lg hover:bg-slate-100 min-h-12 flex items-center"
                  title="Edit thresholds"
                >
                  <Settings size={18} className="text-text-secondary" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
