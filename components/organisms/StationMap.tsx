"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SEVERITY_CONFIG } from "@/lib/severity";
import type { StationWithLatestReading } from "@/types";

/**
 * A lightweight, dependency-free map: plots stations as color-coded pins
 * within a bounding box computed from their own coordinates. This keeps
 * the project at $0 cost (no external map API key), while still giving
 * public visitors immediate visual severity context. Falls back to the
 * list view (see /stations page) as the primary, more detail-rich UI.
 */
export function StationMap({ stations }: { stations: StationWithLatestReading[] }) {
  const bounds = useMemo(() => {
    if (stations.length === 0) return null;
    const lats = stations.map((s) => s.location.lat);
    const lngs = stations.map((s) => s.location.lng);
    const pad = 0.02;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [stations]);

  if (!bounds || stations.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 rounded-xl border border-border bg-slate-50 text-text-secondary text-sm">
        No monitoring stations configured yet
      </div>
    );
  }

  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  return (
    <div
      className="relative h-80 sm:h-96 rounded-xl border border-border overflow-hidden"
      style={{
        background:
          "repeating-linear-gradient(0deg, #EFF6FF, #EFF6FF 39px, #DBEAFE 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #DBEAFE 40px)",
      }}
      aria-label="Map of monitoring stations"
    >
      {stations.map((station) => {
        const top = 100 - ((station.location.lat - bounds.minLat) / latRange) * 100;
        const left = ((station.location.lng - bounds.minLng) / lngRange) * 100;
        const config = SEVERITY_CONFIG[station.severity];

        return (
          <Link
            key={station.id}
            href={`/stations/${station.id}`}
            className="absolute -translate-x-1/2 -translate-y-full group focus:outline-none"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform group-hover:scale-110 group-focus:scale-110"
              style={{ backgroundColor: config.hex }}
              title={`${station.name} — ${config.label}`}
            >
              <span className="sr-only">
                {station.name}: {config.label}
              </span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-xs font-medium bg-white px-2 py-0.5 rounded shadow border border-border opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none">
              {station.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
