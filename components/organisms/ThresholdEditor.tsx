"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { StationThresholds } from "@/types";

interface Props {
  initial: StationThresholds;
  onSave: (thresholds: StationThresholds) => Promise<void>;
}

/**
 * Sets Watch/Warning/Danger cm thresholds plus the rate-of-rise threshold,
 * per DESIGN.md's Admin: Thresholds page. No pre-filled "universal"
 * defaults for a new station — thresholds are genuinely location-specific
 * (see CONTEXT.md / PROMPT.md Phase 5), so a new station starts blank.
 */
export function ThresholdEditor({ initial, onSave }: Props) {
  const [thresholds, setThresholds] = useState<StationThresholds>(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof StationThresholds>(key: K, value: string) {
    const num = value === "" ? NaN : Number(value);
    setThresholds((prev) => ({ ...prev, [key]: num }));
  }

  const isValid =
    [thresholds.watchCm, thresholds.warningCm, thresholds.dangerCm, thresholds.riseRateThresholdCmPerHour].every(
      (v) => !Number.isNaN(v) && v >= 0
    ) && thresholds.watchCm < thresholds.warningCm && thresholds.warningCm < thresholds.dangerCm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      toast.error("Thresholds must be non-negative and increase: Watch < Warning < Danger.");
      return;
    }
    setSaving(true);
    try {
      await onSave(thresholds);
      toast.success("Thresholds saved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save thresholds.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <Field
        label="Watch level (cm)"
        value={thresholds.watchCm}
        onChange={(v) => update("watchCm", v)}
      />
      <Field
        label="Warning level (cm)"
        value={thresholds.warningCm}
        onChange={(v) => update("warningCm", v)}
      />
      <Field
        label="Danger level (cm)"
        value={thresholds.dangerCm}
        onChange={(v) => update("dangerCm", v)}
      />
      <div>
        <Field
          label="Rate-of-rise threshold (cm/hour)"
          value={thresholds.riseRateThresholdCmPerHour}
          onChange={(v) => update("riseRateThresholdCmPerHour", v)}
        />
        <p className="text-xs text-text-secondary mt-1">
          Triggers a Watch-level alert even below the hard threshold if the water is climbing unusually fast.
        </p>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-text-primary mb-1">{label}</span>
      <input
        type="number"
        step="0.1"
        min="0"
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}
