# FloodWatch

Smart Flood Monitoring Alert System — water level + rainfall sensors (Wokwi-simulated) feed a tiered alert dashboard with rate-of-rise detection and resident notifications.

Built with Next.js 16 (App Router, Turbopack), TypeScript (strict), Tailwind CSS v4, React 19, Firebase (Auth + Firestore), and Recharts. Cost: $0 (Firebase Spark plan, Vercel free tier, Wokwi simulation instead of physical hardware).

See `DESIGN.md`, `CONTEXT.md`, and `PROMPT.md` in this folder for the full product/technical spec this project was built from.

---

## 1. Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local with your Firebase project's values (see Section 3 below)
npm run dev
```

App runs at http://localhost:3000.

## 2. Project structure

```
/app
  /(public)/page.tsx                          # Landing page
  /(public)/stations/page.tsx                 # Public station list/map
  /(public)/stations/[id]/page.tsx            # Public station detail
  /(public)/auth/login/page.tsx
  /(public)/auth/signup/page.tsx
  /(dashboard)/dashboard/page.tsx             # Resident dashboard
  /admin/stations/page.tsx
  /admin/stations/new/page.tsx
  /admin/stations/[id]/thresholds/page.tsx
  /admin/alerts/page.tsx
  /api/sensors/[stationId]/reading/route.ts   # Sensor ingestion endpoint
/components
  /ui          — Button, Card, Spinner, Toast, SeverityBadge
  /molecules   — LevelGauge, TrendChart, StationCard, AlertRow
  /organisms   — StationMap, StationDetailView, ThresholdEditor, AlertsOverview
  /shells      — PublicShell, AppShell
/lib
  firebase.ts, firebase-admin.ts, auth.ts, alerts.ts, alerts-client.ts,
  notifications.ts, stations.ts, severity.ts, useCurrentUser.ts, useRequireRole.ts
/types         — shared TypeScript interfaces
/wokwi         — ESP32 simulation sketch (sketch.ino)
/scripts       — test-readings.sh (manual verification for the alert pipeline)
firestore.rules
```

## 3. Firebase setup

1. Create a Firebase project (console.firebase.google.com) on the **Spark** (free) plan.
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore** database (production mode).
4. Project Settings → General → add a Web App → copy the config values into
   `NEXT_PUBLIC_FIREBASE_*` in `.env.local`.
5. Project Settings → Service Accounts → Generate new private key → use the
   JSON's `project_id`, `client_email`, and `private_key` for the
   `FIREBASE_ADMIN_*` env vars (the private key contains literal `\n`
   sequences — keep them as-is, `lib/firebase-admin.ts` converts them back
   to real newlines).
6. **Manual step:** paste the contents of `firestore.rules` into
   Firestore → Rules in the console and click **Publish**. This must be
   done manually every time the rules file changes.
7. Set `DEVICE_API_KEY` to any secret string — the Wokwi sketch must send
   the same value in its `X-Device-Key` header.
8. Bootstrap your first admin: sign up as a resident normally, then in the
   Firestore console manually change that user's `role` field from
   `"resident"` to `"admin"`. Admins are never self-signed-up, per the
   product spec.
9. Create at least one station via `/admin/stations/new`, then set its
   thresholds — there are no default threshold values, since they're
   genuinely location-specific.

## 4. Wokwi hardware simulation

For local VS Code simulation, run `npm run wokwi:build` from this folder,
select `wokwi/wokwi.toml` with **Wokwi: Select Config File**, then restart the
simulator. Rebuild after changing the sketch; Wokwi runs the compiled binary.

For online Wokwi, create a new ESP32 project and paste both files from
`sample-wokwiweb/`: `sketch.ino` and `diagram.json`. They are refreshed from
the local source by `npm run wokwi:build` or `npm run wokwi:sync`.

Set `API_ENDPOINT` and `DEVICE_API_KEY` to match your deployed server and
station. Click the HC-SR04 in the running diagram and adjust **Distance**:
80, 50, and 20 cm should report 20, 50, and 80 cm water levels. Distances
of 100 cm or more all report zero. Sensor values print every second and
uploads occur every 10 seconds plus network time. Look for `POST 201`.

See [wokwi/README.md](wokwi/README.md) for local website networking,
firmware troubleshooting, and read-only `npm run sensor:diagnose` checks.

## 5. Testing the alert pipeline manually

Before wiring up Wokwi, verify the ingestion + alert logic directly:

```bash
./scripts/test-readings.sh <stationId> <deviceApiKey> http://localhost:3000
```

This posts a sequence of readings simulating a flat/normal case, a slow
rise, a fast rise (should trigger a Watch alert via the rate-of-rise path
even below the hard threshold), and a threshold-crossing case. Check
`/admin/alerts` after running it.

## 6. Deploy

1. Push to GitHub, import the repo into Vercel, add all env vars from
   `.env.local.example`.
2. Publish `firestore.rules` in the Firebase console (manual step, see
   above — Vercel deploys do not do this for you).
3. Confirm Email/Password auth is enabled and your first admin is
   bootstrapped.
4. Point your Wokwi sketch at the live Vercel URL and demo the full flow:
   raise the simulated water level, watch the `LevelGauge` and
   `SeverityBadge` update live, confirm each threshold crossing creates an
   alert and notifies subscribed residents.

## 7. Non-goals (intentionally out of scope)

- No physical sensor deployment — Wokwi-simulated only; the architecture
  accepts real hardware input unchanged if pursued later.
- No SMS alerting — in-app notifications only, to stay at $0 cost.
- No integration with official meteorological/hydrological data feeds.
- No automated emergency-service dispatch.
- No multi-river, basin-wide flood prediction — per-station thresholds only.

## 8. Brand assets

`public/logo.png` is the source app icon; `public/icon-*.png`,
`public/apple-touch-icon.png`, and `public/favicon.ico` are pre-generated
from it and wired up in `app/layout.tsx` metadata.
