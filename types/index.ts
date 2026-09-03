export type Severity = "normal" | "watch" | "warning" | "danger";

export type AlertCause = "threshold" | "rising_trend";

export type UserRole = "admin" | "resident";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface StationThresholds {
  watchCm: number;
  warningCm: number;
  dangerCm: number;
  /** cm/hour — a rise at or above this rate triggers a Watch alert even below watchCm */
  riseRateThresholdCmPerHour: number;
}

export interface Station {
  id: string;
  name: string;
  riverName: string;
  location: GeoPoint;
  thresholds: StationThresholds;
  createdBy: string;
  createdAt: number;
}

export interface Reading {
  id: string;
  stationId: string;
  waterLevel: number; // cm
  rainfall: number; // mm
  timestamp: number; // epoch ms
}

export interface StationWithLatestReading extends Station {
  latestReading: Reading | null;
  severity: Severity;
}

export interface Alert {
  id: string;
  stationId: string;
  stationName: string;
  severity: Exclude<Severity, "normal">;
  cause: AlertCause;
  triggeredAt: number;
  resolvedAt: number | null;
  acknowledgedBy: string | null;
}

export interface AppUser {
  uid: string;
  email: string;
  phone?: string;
  role: UserRole;
  subscribedStationIds: string[];
}

export interface NotificationItem {
  id: string;
  alertId: string;
  stationId: string;
  stationName: string;
  severity: Exclude<Severity, "normal">;
  message: string;
  read: boolean;
  createdAt: number;
}
