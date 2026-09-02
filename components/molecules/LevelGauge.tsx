"use client";

import { SEVERITY_CONFIG } from "@/lib/severity";
import type { Severity } from "@/types";

interface LevelGaugeProps {
  /** Current water level in cm */
  waterLevel: number;
  /** The station's Danger threshold — used as the top of the visual scale */
  dangerCm: number;
  severity: Severity;
  size?: "sm" | "lg";
}

/**
 * The signature moment: a vertical tank/gauge that renders the current
 * water level as a fill, color-matched to the current severity tier. The
 * fill animates to a new reading when it changes (real-time), except when
 * the user prefers reduced motion, per DESIGN.md Section 1 — the CSS
 * transition below is disabled globally for that case in globals.css.
 *
 * A text-equivalent reading is always rendered alongside the visual, per
 * DESIGN.md Section 7 — the gauge is never the only way to read the value.
 */
export function LevelGauge({ waterLevel, dangerCm, severity, size = "lg" }: LevelGaugeProps) {
  const config = SEVERITY_CONFIG[severity];
  // Scale the tank a bit above the danger threshold so a "danger" reading
  // isn't pinned exactly at the rim.
  const scaleMax = Math.max(dangerCm * 1.2, waterLevel * 1.05, 1);
  const fillPercent = Math.min(100, Math.max(0, (waterLevel / scaleMax) * 100));

  const isLarge = size === "lg";
  const tankHeight = isLarge ? 220 : 120;
  const tankWidth = isLarge ? 100 : 56;

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative rounded-lg border-2 border-slate-300 bg-slate-50 overflow-hidden shrink-0"
        style={{ height: tankHeight, width: tankWidth }}
        role="img"
        aria-label={`Water level ${waterLevel} centimeters, severity ${config.label}`}
      >
        {/* Threshold rungs for visual context */}
        <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full h-px bg-slate-200" />
          ))}
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out"
          style={{
            height: `${fillPercent}%`,
            backgroundColor: config.hex,
          }}
        />
      </div>

      <div>
        <p className="font-mono-data text-3xl font-semibold text-text-primary leading-none">
          {waterLevel.toFixed(1)}
          <span className="text-base font-normal text-text-secondary ml-1">cm</span>
        </p>
        <p className="text-sm mt-1" style={{ color: config.hex }}>
          {config.label} — {config.description}
        </p>
      </div>
    </div>
  );
}
