# FloodWatch — PROMPT.md

Phase 0 happens in Wokwi, not Antigravity — same split as your UrbanPrice/GuardianText Python phases, just with hardware simulation instead of ML. Feed Phases 1+ to Antigravity one at a time, attaching DESIGN.md + CONTEXT.md as context files.

---

## PHASE 0 — Wokwi Simulation Setup (do this yourself, not through Antigravity)

```
1. Go to https://wokwi.com, create a new ESP32 project
2. Paste the sketch from CONTEXT.md Section 2 into sketch.ino
3. Add an HC-SR04 ultrasonic sensor component, wire per the sketch's
   comments (Trig->GPIO 5, Echo->GPIO 18)
4. Update API_ENDPOINT to your deployed Vercel URL once Phase 1-3 are
   live (you'll come back and update this)
5. Set DEVICE_API_KEY to match what you'll set as an env var later
6. Test the "Editing HC-SR04" manual distance adjustment in the Wokwi UI
   — confirm you can simulate the water rising/falling by changing this
   value, same technique you already used successfully for Smart Agriculture

Keep this Wokwi project open in a browser tab — you'll return to it
after the web app is deployed to point it at your real endpoint and
demo the live rise/fall behavior.
```

---

## PHASE 1 — Project Bootstrap (Antigravity)

```
Using DESIGN.md and CONTEXT.md as reference, bootstrap a new Next.js 16
project named "floodwatch" with:

- App Router, TypeScript (strict mode), Tailwind CSS v4, React 19
- Folder structure:
  /app
    /(public)/page.tsx
    /(public)/stations/page.tsx
    /(public)/stations/[id]/page.tsx
    /(public)/auth/login/page.tsx
    /(public)/auth/signup/page.tsx
    /(dashboard)/dashboard/page.tsx
    /admin/stations/page.tsx
    /admin/stations/new/page.tsx
    /admin/stations/[id]/thresholds/page.tsx
    /admin/alerts/page.tsx
    /api/sensors/[stationId]/reading/route.ts
  /components
    /ui, /molecules, /organisms, /shells (SeverityBadge, LevelGauge,
    TrendChart, StationCard, AlertRow, StationMap, StationDetailView,
    ThresholdEditor, AlertsOverview, PublicShell, AppShell)
  /lib
    /firebase.ts, /firebase-admin.ts
    /alerts.ts   → getSeverityTier(), checkRisingTrend(),
                   checkThresholdsAndAlert() exactly per CONTEXT.md Section 4
    /notifications.ts → notifySubscribedResidents()
  /types

Install: firebase, firebase-admin, recharts, lucide-react, react-hot-toast.
Set up Tailwind theme using DESIGN.md's Cobalt + four-tier severity
palette. Load Outfit, Inter, JetBrains Mono. Working `npm run dev`.
Output .env.local.example per CONTEXT.md Section 8.
```

---

## PHASE 2 — Sensor Ingestion & Alert Logic (build and verify in isolation)

```
Using CONTEXT.md Sections 3-4 in full, build:

1. /app/api/sensors/[stationId]/reading/route.ts
2. /lib/alerts.ts — getSeverityTier(), checkRisingTrend(),
   checkThresholdsAndAlert() exactly as specified

Requirements:
- Device key check per CONTEXT.md Section 3 — reject readings without
  the correct X-Device-Key header
- Implement the rate-of-rise logic exactly per Section 4, including the
  escalation rule (fast rise bumps Normal to Watch even below the hard
  threshold)
- VERIFICATION STEP: manually POST a sequence of test readings (via curl
  or a quick script) simulating a slow rise, a fast rise, and a normal
  flat reading — confirm getSeverityTier() and checkRisingTrend() behave
  correctly for each case before connecting the real Wokwi simulation

Complete, deployable files. Do not proceed to Phase 3 until this passes
your own manual test sequence.
```

---

## PHASE 3 — Public Station Views

```
Using DESIGN.md "Stations" and "Station Detail" sections, build:

1. /app/(public)/stations/page.tsx
2. /app/(public)/stations/[id]/page.tsx
3. /components/organisms/StationMap.tsx
4. /components/organisms/StationDetailView.tsx
5. /components/molecules/StationCard.tsx
6. /components/molecules/LevelGauge.tsx
7. /components/molecules/TrendChart.tsx

Requirements:
- Fully public, no auth required — per DESIGN.md's explicit "public
  safety information" note
- LevelGauge: the signature moment per DESIGN.md Section 1, animated
  fill matching current severity color, prefers-reduced-motion fallback
  (instant fill level, no transition)
- Real-time via onSnapshot — station status should update live as new
  readings arrive, without a manual refresh
- TrendChart: water level + rainfall over the last 24-48 hours
- Optimize for fast loading on poor connectivity per DESIGN.md's
  accessibility note — this is safety-critical information

Complete, deployable files.
```

---

## PHASE 4 — Resident Subscriptions & Notifications

```
Using DESIGN.md "Resident Dashboard" section, build:

1. /app/(public)/auth/login/page.tsx
2. /app/(public)/auth/signup/page.tsx
3. /app/(dashboard)/dashboard/page.tsx
4. /lib/notifications.ts — notifySubscribedResidents()
5. /lib/auth.ts

Requirements:
- Public resident self-signup (unlike admin, which is provisioned
  manually per Phase 5's deploy checklist)
- Subscribe/unsubscribe to specific stations from the station detail page
- notifySubscribedResidents(): writes in-app notification records to
  every subscribed resident's uid when an alert fires, using DESIGN.md
  Section 4's calm, factual message tone — copy this exactly, don't
  improvise more urgent-sounding language
- Dashboard: subscribed stations list + alert history

Complete, deployable files.
```

---

## PHASE 5 — Admin: Station & Threshold Management

```
Using DESIGN.md "Admin: Thresholds" and "Admin: Alerts" sections, build:

1. /admin/stations/page.tsx
2. /admin/stations/new/page.tsx
3. /admin/stations/[id]/thresholds/page.tsx
4. /admin/alerts/page.tsx
5. /components/organisms/ThresholdEditor.tsx
6. /components/organisms/AlertsOverview.tsx

Requirements:
- Route guard: admin only
- Station creation: name, river name, location (lat/lng)
- ThresholdEditor: watchCm, warningCm, dangerCm, riseRateThresholdCmPerHour
  — these are genuinely location-specific values, no defaults that
  pretend to be universally correct
- AlertsOverview: all alerts across stations, acknowledge/resolve actions

Complete, deployable files. Final phase before deploy.
```

---

## Deploy Checklist

```
1. Push to GitHub, connect Vercel, set env vars from CONTEXT.md Section 8
2. MANUAL STEP: Firebase Console -> Firestore Rules -> paste CONTEXT.md
   Section 7 -> Publish
3. Enable Email/Password auth, bootstrap first admin manually in
   Firestore console (residents self-signup, admin does not)
4. Create at least one test station with realistic thresholds
5. Return to your Wokwi tab from Phase 0: update API_ENDPOINT to your
   live Vercel URL and the station ID, set DEVICE_API_KEY to match your
   deployed env var, run the simulation
6. Test the full live demo flow: use Wokwi's "Editing HC-SR04" panel to
   manually raise the simulated water level in real time, watch the
   dashboard's LevelGauge and SeverityBadge update live via onSnapshot,
   confirm crossing each threshold (Watch/Warning/Danger) correctly
   triggers an alert and a subscribed resident receives a notification
7. Test the rate-of-rise escalation specifically: raise the simulated
   level quickly (multiple large jumps within the same hour-window) while
   staying below the hard Danger threshold, confirm it still triggers a
   Watch-level alert via the rising-trend path, not just the flat threshold
```

---

Run in order. This is the same category of project as your Smart Agriculture work — the Wokwi setup and the software both deserve real testing before considering this "done," same as that project taught you.
