import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { LevelGauge } from "@/components/molecules/LevelGauge";
import { ReadingFreshness } from "@/components/molecules/LiveDataNotice";
import type { StationWithLatestReading } from "@/types";

export function StationCard({ station }: { station: StationWithLatestReading }) {
  const { latestReading, severity, thresholds } = station;

  return (
    <Link href={`/stations/${station.id}`} className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
      <Card className="p-5 hover:shadow-md transition-shadow duration-150 h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-text-primary">{station.name}</h3>
            <p className="text-sm text-text-secondary">{station.riverName}</p>
          </div>
          {latestReading && <SeverityBadge severity={severity} size="sm" />}
        </div>

        {latestReading ? (
          <>
            <LevelGauge
              waterLevel={latestReading.waterLevel}
              dangerCm={thresholds.dangerCm}
              severity={severity}
              size="sm"
            />
            <ReadingFreshness timestamp={latestReading.timestamp} />
          </>
        ) : (
          <p className="text-sm text-text-secondary py-4">Waiting for first sensor reading</p>
        )}
      </Card>
    </Link>
  );
}
