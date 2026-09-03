"use client";

import { useEffect, useState } from "react";
import { PublicShell } from "@/components/shells/PublicShell";
import { StationCard } from "@/components/molecules/StationCard";
import { StationMap } from "@/components/organisms/StationMap";
import { Spinner } from "@/components/ui/Spinner";
import { watchStationsWithLatestReadings } from "@/lib/stations";
import type { StationWithLatestReading } from "@/types";
import { List, Map as MapIcon } from "lucide-react";

export default function StationsPage() {
  const [stations, setStations] = useState<StationWithLatestReading[] | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    return watchStationsWithLatestReadings(setStations);
  }, []);

  return (
    <PublicShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Monitoring stations</h1>
          <p className="text-text-secondary text-sm">Live status — updates automatically, no refresh needed.</p>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2.5 flex items-center gap-1.5 text-sm font-medium min-h-12 ${
              view === "list" ? "bg-primary text-white" : "bg-white text-text-secondary"
            }`}
          >
            <List size={16} /> List
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-2.5 flex items-center gap-1.5 text-sm font-medium min-h-12 ${
              view === "map" ? "bg-primary text-white" : "bg-white text-text-secondary"
            }`}
          >
            <MapIcon size={16} /> Map
          </button>
        </div>
      </div>

      {stations === null ? (
        <Spinner label="Loading stations…" />
      ) : stations.length === 0 ? (
        <p className="text-text-secondary py-10 text-center">No monitoring stations configured yet</p>
      ) : view === "list" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      ) : (
        <StationMap stations={stations} />
      )}
    </PublicShell>
  );
}
