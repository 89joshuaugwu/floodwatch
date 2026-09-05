"use client";

import { use, useEffect, useState } from "react";
import { PublicShell } from "@/components/shells/PublicShell";
import { StationDetailView } from "@/components/organisms/StationDetailView";
import { Spinner } from "@/components/ui/Spinner";
import { getLiveDataError, LiveDataNotice } from "@/components/molecules/LiveDataNotice";
import { watchStation } from "@/lib/stations";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { subscribeToStation, unsubscribeFromStation } from "@/lib/auth";
import { toast } from "@/components/ui/Toast";
import type { Station } from "@/types";

export default function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StationDetailPageContent key={id} id={id} />;
}

function StationDetailPageContent({ id }: { id: string }) {
  const [station, setStation] = useState<Station | null | undefined>(undefined);
  const { appUser } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    return watchStation(id, (value) => {
      setStation(value);
      setError(null);
    }, (err) => {
      console.error("Station updates failed", err);
      setError(getLiveDataError(err, "Station details"));
    });
  }, [id, attempt]);

  const isResident = appUser?.role === "resident";
  const isSubscribed = !!appUser?.subscribedStationIds.includes(id);

  async function handleSubscribeToggle() {
    if (!appUser) return;
    setBusy(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromStation(appUser.uid, id);
        toast.success("Unsubscribed from this station.");
      } else {
        await subscribeToStation(appUser.uid, id);
        toast.success("Subscribed — you'll be notified of alerts for this station.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <LiveDataNotice error={error} onRetry={() => { setError(null); setAttempt((value) => value + 1); }} />
      {station === undefined && error ? null : station === undefined ? (
        <Spinner label="Loading station…" />
      ) : station === null ? (
        <p className="text-text-secondary py-10 text-center">Station not found.</p>
      ) : (
        <StationDetailView
          key={station.id}
          station={station}
          isResident={isResident}
          isSubscribed={isSubscribed}
          onSubscribeToggle={handleSubscribeToggle}
          subscribeBusy={busy}
        />
      )}
    </PublicShell>
  );
}
