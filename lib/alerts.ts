import { adminDb, Timestamp } from "@/lib/firebase-admin";
import { notifySubscribedResidents } from "@/lib/notifications";
import { getSeverityTier } from "@/lib/alerts-client";
import type { AlertCause, Severity, StationThresholds } from "@/types";

// Re-exported so existing imports of getSeverityTier from "@/lib/alerts"
// (server-side code, tests) keep working unchanged.
export { getSeverityTier };

/**
 * Looks at the last hour of readings for a station and determines whether
 * the water level is rising faster than the station's configured
 * riseRateThresholdCmPerHour. This is what lets a fast-rising river trigger
 * an early Watch alert even while still numerically "Normal" — see
 * CONTEXT.md Section 4 for the rationale.
 */
export async function checkRisingTrend(
  stationId: string,
  thresholds: StationThresholds
): Promise<boolean> {
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

  const snap = await adminDb
    .collection("stations")
    .doc(stationId)
    .collection("readings")
    .where("timestamp", ">=", oneHourAgo)
    .orderBy("timestamp", "asc")
    .get();

  if (snap.size < 2) return false;

  const readings = snap.docs.map((d) => d.data() as { waterLevel: number; timestamp: Timestamp });
  const first = readings[0]!;
  const last = readings[readings.length - 1]!;

  const hoursElapsed = (last.timestamp.toMillis() - first.timestamp.toMillis()) / (60 * 60 * 1000);
  if (hoursElapsed <= 0) return false;

  const riseRate = (last.waterLevel - first.waterLevel) / hoursElapsed;

  return riseRate >= thresholds.riseRateThresholdCmPerHour;
}

/**
 * Reuses an unresolved alert at the same severity. The transaction prevents
 * simultaneous readings from creating duplicate alerts. Pending notification
 * delivery can be retried by the next reading.
 */
export async function createOrUpdateAlert(
  stationId: string,
  severity: Exclude<Severity, "normal">,
  cause: AlertCause
): Promise<{ id: string; notificationsPending: boolean }> {
  const alertsRef = adminDb.collection("alerts");

  const activeAlerts = alertsRef
    .where("stationId", "==", stationId)
    .where("severity", "==", severity)
    .where("resolvedAt", "==", null)
    .limit(1);

  return adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(activeAlerts);
    if (!existing.empty) {
      const alert = existing.docs[0]!;
      return { id: alert.id, notificationsPending: !alert.data().notificationsSentAt };
    }

    const alertRef = alertsRef.doc();
    transaction.create(alertRef, {
      stationId,
      severity,
      cause,
      triggeredAt: Timestamp.now(),
      resolvedAt: null,
      acknowledgedBy: null,
      notificationsSentAt: null,
    });
    return { id: alertRef.id, notificationsPending: true };
  });
}

/**
 * Entry point called after every new sensor reading is written. Determines
 * the effective severity (hard threshold OR fast-rise escalation) and, if
 * elevated, records/updates the alert and notifies subscribed residents.
 */
export async function checkThresholdsAndAlert(stationId: string, waterLevel: number): Promise<void> {
  const stationDoc = await adminDb.collection("stations").doc(stationId).get();
  if (!stationDoc.exists) {
    throw new Error(`Unknown station: ${stationId}`);
  }
  const station = stationDoc.data()!;
  const thresholds: StationThresholds = station.thresholds;

  const tier = getSeverityTier(waterLevel, thresholds);
  const isRisingFast = tier === "normal" && await checkRisingTrend(stationId, thresholds);

  // A station that is still numerically "normal" but rising unusually fast
  // gets escalated to "watch" early. A station already at watch/warning/
  // danger keeps its (higher) hard-threshold tier.
  const effectiveTier: Severity = isRisingFast && tier === "normal" ? "watch" : tier;

  if (effectiveTier !== "normal") {
    const cause: AlertCause = isRisingFast && tier === "normal" ? "rising_trend" : "threshold";
    const alert = await createOrUpdateAlert(stationId, effectiveTier, cause);
    if (alert.notificationsPending) {
      await notifySubscribedResidents(stationId, effectiveTier, { alertId: alert.id, waterLevel, cause });
      await adminDb.collection("alerts").doc(alert.id).update({ notificationsSentAt: Timestamp.now() });
    }
  }
}
