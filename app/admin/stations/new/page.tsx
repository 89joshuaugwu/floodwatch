"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/shells/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useRequireRole } from "@/lib/useRequireRole";
import { Spinner } from "@/components/ui/Spinner";

export default function NewStationPage() {
  const { appUser, loading } = useRequireRole("admin");
  const router = useRouter();
  const [name, setName] = useState("");
  const [riverName, setRiverName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !appUser) {
    return (
      <AppShell role="admin">
        <Spinner />
      </AppShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!name.trim() || !riverName.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      toast.error("Fill in all fields with valid values.");
      return;
    }

    setBusy(true);
    try {
      const docRef = await addDoc(collection(db, "stations"), {
        name: name.trim(),
        riverName: riverName.trim(),
        location: { lat: latNum, lng: lngNum },
        // No pre-filled "universal" defaults — thresholds are genuinely
        // location-specific and must be set deliberately, per DESIGN.md
        // Section 6 / PROMPT.md Phase 5. Admin is routed straight to the
        // threshold editor after creation.
        thresholds: {
          watchCm: 0,
          warningCm: 0,
          dangerCm: 0,
          riseRateThresholdCmPerHour: 0,
        },
        createdBy: appUser!.uid,
        createdAt: serverTimestamp(),
      });
      toast.success("Station created. Now set its thresholds.");
      router.push(`/admin/stations/${docRef.id}/thresholds`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create station.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin">
      <h1 className="font-display text-2xl font-semibold mb-6">New station</h1>
      <Card className="p-6 max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1">Station name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Riverside Bridge"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">River name</span>
            <input
              required
              value={riverName}
              onChange={(e) => setRiverName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Niger River"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium mb-1">Latitude</span>
              <input
                required
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Longitude</span>
              <input
                required
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create station"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
