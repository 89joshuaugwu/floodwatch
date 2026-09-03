"use client";

import { use, useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/shells/AppShell";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ThresholdEditor } from "@/components/organisms/ThresholdEditor";
import { useRequireRole } from "@/lib/useRequireRole";
import { watchStation } from "@/lib/stations";
import type { Station, StationThresholds } from "@/types";

export default function ThresholdsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading } = useRequireRole("admin");
  const [station, setStation] = useState<Station | null | undefined>(undefined);

  useEffect(() => {
    return watchStation(id, setStation);
  }, [id]);

  async function handleSave(thresholds: StationThresholds) {
    await updateDoc(doc(db, "stations", id), { thresholds });
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
      {station === undefined ? (
        <Spinner label="Loading station…" />
      ) : station === null ? (
        <p className="text-text-secondary">Station not found.</p>
      ) : (
        <>
          <h1 className="font-display text-2xl font-semibold mb-1">{station.name} — thresholds</h1>
          <p className="text-text-secondary text-sm mb-6">{station.riverName}</p>
          <Card className="p-6">
            <ThresholdEditor initial={station.thresholds} onSave={handleSave} />
          </Card>
        </>
      )}
    </AppShell>
  );
}
