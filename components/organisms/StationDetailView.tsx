"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSeverityTier } from "@/lib/alerts-client";
import { LevelGauge } from "@/components/molecules/LevelGauge";
import { getLiveDataError, LiveDataNotice, ReadingFreshness } from "@/components/molecules/LiveDataNotice";
import { TrendChart } from "@/components/molecules/TrendChart";
import { AlertRow } from "@/components/molecules/AlertRow";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { Alert, Reading, Station } from "@/types";

interface Props {
  station: Station;
  isResident: boolean;
  isSubscribed: boolean;
  onSubscribeToggle?: () => void;
  subscribeBusy?: boolean;
}

export function StationDetailView({ station, isResident, isSubscribed, onSubscribeToggle, subscribeBusy }: Props) {
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [readingsAttempt, setReadingsAttempt] = useState(0);
  const [alertsAttempt, setAlertsAttempt] = useState(0);

  // Live readings — updates automatically as new sensor data arrives,
  // per PROMPT.md Phase 3 ("real-time via onSnapshot ... without a manual
  // refresh").
  useEffect(() => {
    const readingsQuery = query(
      collection(db, "stations", station.id, "readings"),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(readingsQuery, (snap) => {
      const items: Reading[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            stationId: station.id,
            waterLevel: data.waterLevel,
            rainfall: data.rainfall,
            timestamp: data.timestamp?.toMillis?.() ?? 0,
          };
        })
        .reverse();
      setReadings(items);
      setReadingsError(null);
    }, (error) => {
      console.error("Sensor reading updates failed", error);
      setReadingsError(getLiveDataError(error, "Sensor readings"));
    });
    return unsub;
  }, [station.id, readingsAttempt]);

  useEffect(() => {
    const alertsQuery = query(
      collection(db, "alerts"),
      orderBy("triggeredAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(alertsQuery, (snap) => {
      const items: Alert[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            stationId: data.stationId,
            stationName: station.name,
            severity: data.severity,
            cause: data.cause,
            triggeredAt: data.triggeredAt?.toMillis?.() ?? Date.now(),
            resolvedAt: data.resolvedAt?.toMillis?.() ?? null,
            acknowledgedBy: data.acknowledgedBy ?? null,
          };
        })
        .filter((a) => a.stationId === station.id);
      setAlerts(items);
      setAlertsError(null);
    }, (error) => {
      console.error("Station alert updates failed", error);
      setAlertsError(getLiveDataError(error, "Station alerts"));
    });
    return unsub;
  }, [station.id, station.name, alertsAttempt]);

  const latest = readings && readings.length > 0 ? readings[readings.length - 1]! : null;
  const severity = latest ? getSeverityTier(latest.waterLevel, station.thresholds) : "normal";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text-primary">{station.name}</h1>
            <p className="text-text-secondary">{station.riverName}</p>
          </div>
          {latest && <SeverityBadge severity={severity} />}
        </div>

        <LiveDataNotice showOffline={false} error={readingsError} onRetry={() => { setReadingsError(null); setReadingsAttempt((value) => value + 1); }} />

        {readings === null && readingsError ? null : readings === null ? (
          <Spinner label="Loading station data…" />
        ) : latest ? (
          <>
            <LevelGauge waterLevel={latest.waterLevel} dangerCm={station.thresholds.dangerCm} severity={severity} />
            <ReadingFreshness timestamp={latest.timestamp} />
            <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <dt className="text-text-secondary">Rainfall</dt>
                <dd className="font-mono-data font-medium">{latest.rainfall} mm</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Danger threshold</dt>
                <dd className="font-mono-data font-medium">{station.thresholds.dangerCm} cm</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-text-secondary py-6">Waiting for first sensor reading</p>
        )}

        {isResident && (
          <div className="mt-6">
            <Button variant={isSubscribed ? "secondary" : "primary"} onClick={onSubscribeToggle} disabled={subscribeBusy}>
              {isSubscribed ? "Unsubscribe from alerts" : "Subscribe to alerts"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Trend — last readings</h2>
        {readings === null && readingsError ? (
          <p className="text-sm text-text-secondary">The trend is unavailable while sensor readings cannot be loaded.</p>
        ) : readings === null ? <Spinner /> : <TrendChart readings={readings} />}
      </Card>

      <Card>
        <CardBody className="pt-5">
          <h2 className="font-display text-lg font-semibold mb-2">Recent alerts</h2>
          <LiveDataNotice showOffline={false} error={alertsError} onRetry={() => { setAlertsError(null); setAlertsAttempt((value) => value + 1); }} />
          {alerts === null && alertsError ? null : alerts === null ? (
            <Spinner />
          ) : alerts.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">No alerts for this station in the recent alert feed.</p>
          ) : (
            alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </CardBody>
      </Card>
    </div>
  );
}
