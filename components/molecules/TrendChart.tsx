"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { Reading } from "@/types";

export function TrendChart({ readings }: { readings: Reading[] }) {
  const data = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    waterLevel: r.waterLevel,
    rainfall: r.rainfall,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
        Waiting for first sensor reading
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#64748B" }} />
          <YAxis
            yAxisId="level"
            tick={{ fontSize: 12, fill: "#64748B" }}
            label={{ value: "cm", angle: -90, position: "insideLeft", fontSize: 12, fill: "#64748B" }}
          />
          <YAxis
            yAxisId="rain"
            orientation="right"
            tick={{ fontSize: 12, fill: "#64748B" }}
            label={{ value: "mm", angle: 90, position: "insideRight", fontSize: 12, fill: "#64748B" }}
          />
          <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: "#E2E8F0" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="rain" dataKey="rainfall" name="Rainfall (mm)" fill="#93C5FD" radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="level"
            type="monotone"
            dataKey="waterLevel"
            name="Water level (cm)"
            stroke="#1D4ED8"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
