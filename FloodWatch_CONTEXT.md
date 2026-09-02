# FloodWatch — CONTEXT.md

Technical architecture reference. Pair with `DESIGN.md` when prompting Antigravity.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) | |
| Language | TypeScript (strict mode) | Threshold/alert logic must be fully typed |
| Styling | Tailwind CSS v4 | Cobalt + severity ladder per DESIGN.md |
| Sensor layer | Wokwi (ESP32 + HC-SR04 ultrasonic + simulated rainfall input) | Same simulation approach you already built and tested for Smart Agriculture — no physical hardware cost |
| Auth | Firebase Auth (email/password) | Admin provisioned manually, resident public self-signup |
| Database | Firestore | Spark plan free tier |
| Charts | Recharts | TrendChart per DESIGN.md |
| Hosting | Vercel | Free tier |

---

## 2. Wokwi Simulation Setup (same pattern as your Smart-Agri project)

```cpp
/*
  FloodWatch - Wokwi Simulation
  ESP32 + HC-SR04 (water level, via distance-to-surface) + simulated rainfall

  HOW TO USE:
  1. Go to https://wokwi.com, create a new ESP32 project
  2. Paste this code into sketch.ino
  3. Wire HC-SR04: VCC->5V, GND->GND, Trig->GPIO 5, Echo->GPIO 18
     (mount facing down toward the water surface — distance DECREASES
     as water level RISES, remember to invert this in your reading logic)
  4. Update API_ENDPOINT below with your deployed Vercel URL
  5. Click the green Play button to run the simulation
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* API_ENDPOINT = "https://floodwatch-web-monitor.vercel.app/api/sensors/[stationId]/reading";
const char* DEVICE_API_KEY = "flood-esp32-secret-key";

#define TRIG_PIN 5
#define ECHO_PIN 18
#define STATION_HEIGHT_CM 100

const unsigned long READ_INTERVAL_MS = 10000;
unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  if (millis() - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = millis();

    digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH);
    float distanceCm = duration * 0.0343 / 2;
    float waterLevelCm = STATION_HEIGHT_CM - distanceCm; // INVERTED: less
                                                            // distance = higher water

    sendReading(waterLevelCm);
  }
}

void sendReading(float waterLevelCm) {
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  String payload = "{\"waterLevel\":" + String(waterLevelCm) +
                    ",\"rainfall\":0}";

  int code = http.POST(payload);
  Serial.println(code);
  http.end();
}
```

Same in-simulation editing trick you already used: click "Editing HC-SR04" in Wokwi and manually adjust the simulated distance to make the water level rise/fall in real time, watching your dashboard respond — this is exactly the demo capability that made your Smart-Agri Wokwi setup effective, reuse it directly.

---

## 3. Server-Side Reading Ingestion

```typescript
// /app/api/sensors/[stationId]/reading/route.ts
async function handleReading(stationId: string, waterLevel: number, rainfall: number, deviceKey: string) {
  if (deviceKey !== process.env.DEVICE_API_KEY) {
    throw new Error("Unauthorized device.");
  }

  const readingRef = db.collection("stations").doc(stationId).collection("readings").doc();
  await readingRef.set({ waterLevel, rainfall, timestamp: Timestamp.now() });

  await checkThresholdsAndAlert(stationId, waterLevel);
}
```

---

## 4. Threshold + Rate-of-Rise Alert Logic

```typescript
interface StationThresholds {
  watchCm: number;
  warningCm: number;
  dangerCm: number;
  riseRateThresholdCmPerHour: number;
}

function getSeverityTier(waterLevel: number, thresholds: StationThresholds): Severity {
  if (waterLevel >= thresholds.dangerCm) return "danger";
  if (waterLevel >= thresholds.warningCm) return "warning";
  if (waterLevel >= thresholds.watchCm) return "watch";
  return "normal";
}

async function checkRisingTrend(stationId: string, thresholds: StationThresholds): Promise<boolean> {
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const snap = await db.collection("stations").doc(stationId).collection("readings")
    .where("timestamp", ">=", oneHourAgo)
    .orderBy("timestamp", "asc")
    .get();

  if (snap.size < 2) return false;

  const readings = snap.docs.map((d) => d.data());
  const first = readings[0];
  const last = readings[readings.length - 1];
  const hoursElapsed = (last.timestamp.toMillis() - first.timestamp.toMillis()) / (60 * 60 * 1000);
  const riseRate = (last.waterLevel - first.waterLevel) / hoursElapsed;

  return riseRate >= thresholds.riseRateThresholdCmPerHour;
}

async function checkThresholdsAndAlert(stationId: string, waterLevel: number): Promise<void> {
  const station = (await db.collection("stations").doc(stationId).get()).data()!;
  const thresholds: StationThresholds = station.thresholds;

  const tier = getSeverityTier(waterLevel, thresholds);
  const isRisingFast = await checkRisingTrend(stationId, thresholds);

  const effectiveTier = isRisingFast && tier === "normal" ? "watch" : tier;

  if (effectiveTier !== "normal") {
    await createOrUpdateAlert(stationId, effectiveTier, isRisingFast ? "rising_trend" : "threshold");
    await notifySubscribedResidents(stationId, effectiveTier);
  }
}
```

**Why rate-of-rise matters as a real feature, not decoration:** a river climbing 3cm/hour and one climbing 30cm/hour reach the same "Danger" number very differently — the second gives residents far less warning time. Flagging unusually fast rises early, even before the hard threshold, is a genuine safety improvement over threshold-only systems, and it's the legitimate "smart" content in "Smart Flood Monitoring."

---

## 5. Firestore Data Model

```
/stations/{stationId}
  name, riverName, location: { lat, lng }
  thresholds: { watchCm, warningCm, dangerCm, riseRateThresholdCmPerHour }
  createdBy: uid

/stations/{stationId}/readings/{readingId}
  waterLevel, rainfall, timestamp

/alerts/{alertId}
  stationId, severity: "watch"|"warning"|"danger"
  cause: "threshold" | "rising_trend"
  triggeredAt, resolvedAt: timestamp | null
  acknowledgedBy: uid | null

/users/{uid}
  uid, email, phone
  role: "admin" | "resident"
  subscribedStationIds: string[]

/notifications/{uid}/items/{id}
  alertId, stationId, severity, message, read: boolean, createdAt
```

---

## 6. RBAC

| Action | Public (no login) | Resident | Admin |
|---|---|---|---|
| View station status/data | Yes | Yes | Yes |
| Subscribe to station alerts | No | Yes | N/A |
| Manage stations | No | No | Yes |
| Set thresholds | No | No | Yes |
| Acknowledge/resolve alerts | No | No | Yes |

---

## 7. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function getRole() {
      return request.auth != null
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
        : null;
    }

    match /stations/{stationId} {
      allow read: if true;
      allow write: if getRole() == "admin";

      match /readings/{readingId} {
        allow read: if true;
        allow write: if false;
      }
    }

    match /alerts/{alertId} {
      allow read: if true;
      allow write: if getRole() == "admin";
    }

    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if getRole() == "admin" || (request.auth.uid == uid &&
        request.resource.data.role == resource.data.role);
    }

    match /notifications/{uid}/items/{id} {
      allow read, update: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null;
    }
  }
}
```

⚠️ Manual publish required in Firebase Console every time these rules change.

---

## 8. Environment Variables

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

DEVICE_API_KEY=

NEXT_PUBLIC_APP_URL=https://floodwatch.vercel.app
```

---

## 9. Non-Goals (out of scope — state these explicitly)

- No real physical sensor deployment — Wokwi-simulated, same documented scope decision as your Smart Agriculture project; architecture accepts real hardware input unchanged if pursued later
- No SMS alerting — in-app/email notifications only, to stay at $0 cost
- No integration with official meteorological/hydrological agency data feeds — station data is self-contained to this system's own sensors
- No automated emergency service dispatch — the system alerts, it does not itself contact emergency responders
- No multi-river hydrological modeling — per-station threshold logic only, not a river-basin-wide flood prediction model
