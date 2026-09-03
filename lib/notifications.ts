import { adminDb, Timestamp } from "@/lib/firebase-admin";
import type { Severity } from "@/types";

const SEVERITY_LABEL: Record<Exclude<Severity, "normal">, string> = {
  watch: "Watch",
  warning: "Warning",
  danger: "Danger",
};

/**
 * Builds the resident-facing alert message. Copy stays factual and
 * instructive at every severity, per DESIGN.md Section 4 — never
 * sensationalized language, even at Danger. Do not improvise more urgent
 * wording; this tone is a deliberate product decision.
 */
export function buildAlertMessage(
  stationName: string,
  severity: Exclude<Severity, "normal">,
  waterLevel: number,
  thresholdCm: number
): string {
  const label = SEVERITY_LABEL[severity];
  const base = `Water level at ${stationName} has reached ${label} stage (${waterLevel}cm, above the ${thresholdCm}cm threshold).`;

  if (severity === "danger") {
    return `${base} If you are in this area, move to higher ground and follow local emergency guidance.`;
  }
  if (severity === "warning") {
    return `${base} Conditions are approaching flood stage — stay alert and monitor updates.`;
  }
  return `${base} Water is rising — keep an eye on this station for further updates.`;
}

/**
 * Writes an in-app notification record to every resident subscribed to
 * this station. Called from checkThresholdsAndAlert() once an alert is
 * created. In-app/email only per CONTEXT.md Section 9 (no SMS, to stay at
 * $0 cost) — email dispatch would be wired in here via a provider such as
 * Resend or SendGrid using the same message text.
 */
export async function notifySubscribedResidents(
  stationId: string,
  severity: Exclude<Severity, "normal">
): Promise<void> {
  const stationDoc = await adminDb.collection("stations").doc(stationId).get();
  if (!stationDoc.exists) return;
  const station = stationDoc.data()!;

  const thresholdCm =
    severity === "danger"
      ? station.thresholds.dangerCm
      : severity === "warning"
        ? station.thresholds.warningCm
        : station.thresholds.watchCm;

  const latestReadingSnap = await adminDb
    .collection("stations")
    .doc(stationId)
    .collection("readings")
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();
  const waterLevel = latestReadingSnap.empty ? thresholdCm : latestReadingSnap.docs[0]!.data().waterLevel;

  const message = buildAlertMessage(station.name, severity, waterLevel, thresholdCm);

  const usersSnap = await adminDb
    .collection("users")
    .where("subscribedStationIds", "array-contains", stationId)
    .where("role", "==", "resident")
    .get();

  const alertSnap = await adminDb
    .collection("alerts")
    .where("stationId", "==", stationId)
    .where("severity", "==", severity)
    .where("resolvedAt", "==", null)
    .limit(1)
    .get();
  const alertId = alertSnap.empty ? null : alertSnap.docs[0]!.id;

  const batch = adminDb.batch();
  for (const userDoc of usersSnap.docs) {
    const itemRef = adminDb.collection("notifications").doc(userDoc.id).collection("items").doc();
    batch.set(itemRef, {
      alertId,
      stationId,
      stationName: station.name,
      severity,
      message,
      read: false,
      createdAt: Timestamp.now(),
    });
  }
  await batch.commit();
}
