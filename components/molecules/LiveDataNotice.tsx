"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

export function getLiveDataError(error: { code?: string }, resource: string): string {
  if (error.code === "permission-denied" || error.code === "unauthenticated") {
    return `${resource} could not be loaded because access was denied. Please contact the site administrator if this continues.`;
  }
  if (error.code === "unavailable") {
    return `${resource} are temporarily unavailable. Check your connection and try again.`;
  }
  return `${resource} could not be updated. Please try again. Previously received values may be out of date.`;
}

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function LiveDataNotice({ error, onRetry, showOffline = true }: {
  error?: string | null;
  onRetry?: () => void;
  showOffline?: boolean;
}) {
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  if (!error && (online || !showOffline)) return null;

  return (
    <div role={error ? "alert" : "status"} className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 mb-4">
      <p>{online ? error : "You are offline. Station values cannot update until your connection returns."}</p>
      {error && onRetry && (
        <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry} disabled={!online}>
          Retry live updates
        </Button>
      )}
    </div>
  );
}

/** Re-check age even when the sensor stops sending readings. */
export function ReadingFreshness({ timestamp }: { timestamp: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return <p className="text-xs text-amber-800 mt-3">Reading time is unavailable. These values may be out of date.</p>;
  }

  const ageMs = Math.max(0, now - timestamp);
  const stale = ageMs >= 60_000;

  return (
    <div className={`text-xs mt-3 ${stale ? "text-amber-800" : "text-text-secondary"}`}>
      <p>Last reading <time dateTime={new Date(timestamp).toISOString()}>{new Date(timestamp).toLocaleString()}</time></p>
      {stale && <p className="mt-1 font-medium">No new reading for over a minute. These values may be out of date.</p>}
    </div>
  );
}
