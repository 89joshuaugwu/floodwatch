# FloodWatch — DESIGN.md

**Product:** Smart Flood Monitoring Alert System — water level + rainfall sensors (Wokwi-simulated, same approach as your Smart Agriculture project) feed a tiered alert dashboard with rate-of-rise detection and resident notifications.
**Target:** Admin (disaster-management authority — manages stations/thresholds), Residents (subscribe to alerts for stations near them).
**Status:** Production-ready spec for Next.js 16 + Tailwind CSS v4 + React 19.
**Cost:** $0 — Firebase Spark, Vercel free tier, Wokwi simulation (free) instead of physical hardware.

---

## 1. Brand Identity

### Name & Positioning
**FloodWatch** — plain, evokes vigilance without being alarmist in the name itself (the alerts themselves carry the urgency, per Section 4).

### Color Palette — Water/Official + Tiered Severity Ladder

| Role | Color | Hex | Use |
|---|---|---|---|
| Primary | Deep Cobalt | `#1D4ED8` | Headers, primary actions, official/trustworthy framing |
| Normal | Green | `#16A34A` | Safe water levels |
| Watch | Amber | `#D97706` | Rising, monitor |
| Warning | Orange | `#EA580C` | Approaching flood stage |
| Danger | Red | `#DC2626` | At/above flood stage — evacuate |
| Background | Off-White | `#F8FAFC` | Standard background |
| Card BG | White | `#FFFFFF` | Cards |
| Border | Slate 200 | `#E2E8F0` | Dividers |
| Text Primary | Slate 900 | `#0F172A` | Headings |
| Text Secondary | Slate 500 | `#64748B` | Labels |

This four-tier ladder (Normal/Watch/Warning/Danger) matches real hydrological agency conventions (Nigeria's NIHSA uses an equivalent tiered system) — not an invented scale, a legitimate defense point.

### Typography
- **Display:** Outfit 600 — clean, official, modern
- **Body:** Inter 400
- **Mono:** JetBrains Mono — sensor readings, coordinates, timestamps

### The Signature Moment: The Level Gauge
Each station's current water level renders as a vertical tank/gauge visual, water fill animating smoothly to the current reading, color-matched to its current tier (green through red). When a new reading arrives (real-time), the fill level animates to the new position rather than snapping — this is the single visual element that makes the abstract number ("47cm") viscerally readable as "how much danger am I actually in."

Respect prefers-reduced-motion: fill level updates instantly to the new position, no animated transition.

---

## 2. Page Map & Routing

```
/                                    # Public landing
/stations                            # Public map/list of all stations,
                                        current status — no login required,
                                        this is public safety information
/stations/[id]                       # Station detail — gauge, trend chart, history
/auth/login                          # Admin login only
/auth/signup                         # Resident signup (subscribe to alerts)
  |
/dashboard                           # Resident: subscribed stations, alert history
  |
/admin                                # Admin only
  |- /admin/stations
  |- /admin/stations/new
  |- /admin/stations/[id]/thresholds
  |- /admin/alerts                   # All triggered alerts, resolve/acknowledge
```

Station status is public, unauthenticated. Flood risk is public safety information — anyone should be able to check current levels without an account. Login is only needed to subscribe to personalized alerts.

---

## 3. Component Architecture

### Shells
- **PublicShell** — minimal, station map/list is the primary public surface
- **AppShell** — resident/admin dashboards

### Atoms
- **SeverityBadge** — Normal/Watch/Warning/Danger, per the four-tier palette, always paired with text
- **Button**, **Card**, **Spinner**, **Toast**

### Molecules
- **LevelGauge** — the signature moment tank visual, per Section 1
- **TrendChart** — water level + rainfall over time (Recharts)
- **StationCard** — (list view) name, current SeverityBadge, mini gauge, last updated
- **AlertRow** — timestamp, station, severity, cause (threshold crossed / rising trend)

### Organisms
- **StationMap** — all stations plotted, color-coded pins by current severity
- **StationDetailView** — full LevelGauge, TrendChart, recent AlertRow history for one station
- **ThresholdEditor** (admin) — set Watch/Warning/Danger cm values + rate-of-rise threshold, per station
- **AlertsOverview** (admin) — all active/historical alerts across stations

---

## 4. Alert Tone — Calm and Clear, Not Panic-Inducing

Even at Danger level, copy stays factual and instructive rather than frantic — panic doesn't help people make good decisions during an actual emergency.

```
[Danger alert notification]
  "Water level at [Station Name] has reached Danger stage (52cm,
   above the 50cm threshold). If you are in this area, move to higher
   ground and follow local emergency guidance."
```

Never sensationalized language, never repeated alarm sounds/vibration beyond what's necessary to get attention once.

---

## 5. Mobile-First / Responsive Spec

- StationMap/list: fully responsive, this is likely checked on a phone during an actual weather event — must load fast and work on poor connectivity
- LevelGauge: scales down cleanly on mobile, stays legible
- Tap targets 48px throughout

---

## 6. Page-by-Page UX Flow

### Stations (/stations) — public
```
[StationMap or list toggle]
[Each station: StationCard — name, mini LevelGauge, SeverityBadge]
[Tap -> station detail]
```

### Station Detail (/stations/[id])
```
[Full LevelGauge — large, prominent]
[Current: water level, rainfall, last updated timestamp]
[TrendChart — last 24-48 hours]
[Recent alerts for this station]
[If logged in as resident: Subscribe/Unsubscribe button]
```

### Resident Dashboard (/dashboard)
```
[Subscribed stations — StationCards]
[Alert history for subscribed stations]
```

### Admin: Thresholds (/admin/stations/[id]/thresholds)
```
[Watch level (cm)] [Warning level (cm)] [Danger level (cm)]
[Rate-of-rise threshold (cm/hour) — triggers a Watch-level alert even
 below the hard threshold if the water is climbing unusually fast]
[Save button]
```

### Admin: Alerts (/admin/alerts)
```
[All alerts, filterable by station/severity/status]
[Acknowledge/resolve actions]
```

---

## 7. Accessibility

- Contrast: Slate 900 on Off-White = 15.8:1 (WCAG AAA)
- SeverityBadge always paired with text, critical here since color-blind users must be able to distinguish flood risk levels
- LevelGauge has a text-equivalent reading always visible, never gauge-only
- Public station pages must load and function well on low-end devices/poor connectivity — this is safety-critical information

---

## 8. Empty & Loading States

```
No stations yet: "No monitoring stations configured yet"
No readings yet for a station: "Waiting for first sensor reading"
No alerts: "No alerts triggered — all stations normal"
```

This DESIGN.md pairs with CONTEXT.md for the full technical architecture (including the Wokwi simulation setup and rate-of-rise detection logic) and PROMPT.md for phase-by-phase scaffolding.
