"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/shells/AppShell";
import { StationCard } from "@/components/molecules/StationCard";
import { AlertRow } from "@/components/molecules/AlertRow";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useRequireRole } from "@/lib/useRequireRole";
import { watchStationsWithLatestReadings } from "@/lib/stations";
import type { Alert, StationWithLatestReading } from "@/types";

export default function DashboardPage() {
  const { appUser, loading } = useRequireRole("resident");
  const [allStations, setAllStations] = useState<StationWithLatestReading[] | null>(null);
  const [notifications, setNotifications] = useState<Alert[] | null>(null);

  useEffect(() => {
    return watchStationsWithLatestReadings(setAllStations);
  }, []);

  useEffect(() => {
    if (!appUser) return;
    const q = query(
      collection(db, "notifications", appUser.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: Alert[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          stationId: data.stationId,
          stationName: data.stationName,
          severity: data.severity,
          cause: "threshold",
          triggeredAt: data.createdAt?.toMillis?.() ?? Date.now(),
          resolvedAt: null,
          acknowledgedBy: null,
        };
      });
      setNotifications(items);
    });
    return unsub;
  }, [appUser]);

  if (loading || !appUser) {
    return (
      <AppShell role="resident">
        <Spinner label="Loading dashboard…" />
      </AppShell>
    );
  }

  const subscribed = (allStations ?? []).filter((s) => appUser.subscribedStationIds.includes(s.id));

  return (
    <AppShell role="resident">
      <h1 className="font-display text-2xl font-semibold mb-6">Your dashboard</h1>

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-3">Subscribed stations</h2>
        {allStations === null ? (
          <Spinner />
        ) : subscribed.length === 0 ? (
          <Card className="p-6">
            <p className="text-text-secondary text-sm">
              You&apos;re not subscribed to any stations yet.{" "}
              <Link href="/stations" className="text-primary font-medium">
                Browse stations
              </Link>{" "}
              and subscribe to get alerts.
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscribed.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Alert history</h2>
        <Card>
          <CardBody className="pt-5">
            {notifications === null ? (
              <Spinner />
            ) : notifications.length === 0 ? (
              <p className="text-sm text-text-secondary py-4">No alerts triggered — all stations normal</p>
            ) : (
              notifications.map((n) => <AlertRow key={n.id} alert={n} />)
            )}
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}
