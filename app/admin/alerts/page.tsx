"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/shells/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { AlertsOverview } from "@/components/organisms/AlertsOverview";
import { toast } from "@/components/ui/Toast";
import { useRequireRole } from "@/lib/useRequireRole";
import { watchStationsWithLatestReadings } from "@/lib/stations";
import type { Alert, StationWithLatestReading } from "@/types";

export default function AdminAlertsPage() {
  const { appUser, loading } = useRequireRole("admin");
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [stations, setStations] = useState<StationWithLatestReading[] | null>(null);

  useEffect(() => {
    return watchStationsWithLatestReadings(setStations);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("triggeredAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const stationNameById = new Map((stations ?? []).map((s) => [s.id, s.name]));
      const items: Alert[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          stationId: data.stationId,
          stationName: stationNameById.get(data.stationId) ?? data.stationId,
          severity: data.severity,
          cause: data.cause,
          triggeredAt: data.triggeredAt?.toMillis?.() ?? Date.now(),
          resolvedAt: data.resolvedAt?.toMillis?.() ?? null,
          acknowledgedBy: data.acknowledgedBy ?? null,
        };
      });
      setAlerts(items);
    });
    return unsub;
  }, [stations]);

  async function handleAcknowledge(alertId: string) {
    if (!appUser) return;
    try {
      await updateDoc(doc(db, "alerts", alertId), { acknowledgedBy: appUser.uid });
    } catch (err) {
      console.error(err);
      toast.error("Failed to acknowledge alert.");
    }
  }

  async function handleResolve(alertId: string) {
    try {
      await updateDoc(doc(db, "alerts", alertId), { resolvedAt: new Date() });
      toast.success("Alert resolved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to resolve alert.");
    }
  }

  if (loading) {
    return (
      <AppShell role="admin">
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin">
      <h1 className="font-display text-2xl font-semibold mb-6">Alerts</h1>
      <Card>
        <CardBody className="pt-5">
          {alerts === null || stations === null ? (
            <Spinner />
          ) : (
            <AlertsOverview
              alerts={alerts}
              stationOptions={stations.map((s) => ({ id: s.id, name: s.name }))}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
