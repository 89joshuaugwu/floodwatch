import { adminDb, Timestamp } from "@/lib/firebase-admin";
import type { AlertCause, Severity } from "@/types";

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
  thresholdCm: number,
  cause: AlertCause = "threshold"
): string {
  const label = SEVERITY_LABEL[severity];
  const base = cause === "rising_trend"
    ? `Water level at ${stationName} is rising quickly (${waterLevel}cm). A Watch alert is active because of the rate of rise.`
    : `Water level at ${stationName} has reached ${label} stage (${waterLevel}cm, at or above the ${thresholdCm}cm threshold).`;

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
  severity: Exclude<Severity, "normal">,
  alert: { alertId: string; waterLevel: number; cause: AlertCause }
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

  const message = buildAlertMessage(station.name, severity, alert.waterLevel, thresholdCm, alert.cause);

  const usersSnap = await adminDb
    .collection("users")
    .where("subscribedStationIds", "array-contains", stationId)
    .where("role", "==", "resident")
    .get();

  // Keep transactions below Firestore's write limit. The alert ID makes
  // delivery idempotent; retries never duplicate an item or reset its read state.
  for (let offset = 0; offset < usersSnap.docs.length; offset += 400) {
    const itemRefs = usersSnap.docs.slice(offset, offset + 400).map((userDoc) =>
      adminDb.collection("notifications").doc(userDoc.id).collection("items").doc(alert.alertId)
    );
    await adminDb.runTransaction(async (transaction) => {
      const existingItems = await transaction.getAll(...itemRefs);
      for (const item of existingItems) {
        if (item.exists) continue;
        transaction.create(item.ref, {
          alertId: alert.alertId,
          stationId,
          stationName: station.name,
          severity,
          message,
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    });
  }
}
