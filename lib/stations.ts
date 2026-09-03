"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  collectionGroup,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSeverityTier } from "@/lib/alerts-client";
import type { Reading, Station, StationWithLatestReading } from "@/types";

function toStation(id: string, data: DocumentData): Station {
  return {
    id,
    name: data.name,
    riverName: data.riverName,
    location: data.location,
    thresholds: data.thresholds,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

/**
 * Subscribes to all stations plus each station's single latest reading,
 * combining them into StationWithLatestReading for the public list/map.
 * Fully public — no auth required, per DESIGN.md's "public safety
 * information" note.
 */
export function watchStationsWithLatestReadings(
  callback: (stations: StationWithLatestReading[]) => void
): () => void {
  const unsubReadingListeners = new Map<string, () => void>();
  let latestStations: Station[] = [];
  const latestReadings = new Map<string, Reading | null>();

  function emit() {
    const combined: StationWithLatestReading[] = latestStations.map((station) => {
      const latestReading = latestReadings.get(station.id) ?? null;
      const severity = latestReading ? getSeverityTier(latestReading.waterLevel, station.thresholds) : "normal";
      return { ...station, latestReading, severity };
    });
    callback(combined);
  }

  const unsubStations = onSnapshot(collection(db, "stations"), (snap) => {
    latestStations = snap.docs.map((d) => toStation(d.id, d.data()));

    // Reconcile per-station reading listeners with the current station set.
    const currentIds = new Set(latestStations.map((s) => s.id));

    for (const [stationId, unsub] of unsubReadingListeners) {
      if (!currentIds.has(stationId)) {
        unsub();
        unsubReadingListeners.delete(stationId);
        latestReadings.delete(stationId);
      }
    }

    for (const station of latestStations) {
      if (unsubReadingListeners.has(station.id)) continue;
      const readingQuery = query(
        collection(db, "stations", station.id, "readings"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const unsubReading = onSnapshot(readingQuery, (readingSnap) => {
        const docSnap = readingSnap.docs[0];
        if (!docSnap) {
          latestReadings.set(station.id, null);
        } else {
          const data = docSnap.data();
          latestReadings.set(station.id, {
            id: docSnap.id,
            stationId: station.id,
            waterLevel: data.waterLevel,
            rainfall: data.rainfall,
            timestamp: data.timestamp?.toMillis?.() ?? Date.now(),
          });
        }
        emit();
      });
      unsubReadingListeners.set(station.id, unsubReading);
    }

    emit();
  });

  return () => {
    unsubStations();
    for (const unsub of unsubReadingListeners.values()) unsub();
  };
}

export function watchStation(stationId: string, callback: (station: Station | null) => void): () => void {
  return onSnapshot(doc(db, "stations", stationId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(toStation(snap.id, snap.data()));
  });
}

// Unused directly but kept for potential future cross-station queries
// (e.g. an admin-wide readings feed) without changing the data model.
export const _readingsCollectionGroup = () => collectionGroup(db, "readings");
