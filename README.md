# FloodWatch

FloodWatch is a smart flood monitoring dashboard: it accepts protected ESP32/Wokwi readings, applies per-station thresholds plus rate-of-rise detection, and gives residents public status pages and alert subscriptions.

## Start it

1. Install Node.js 20.9+.
2. Run `npm install` then copy `.env.local.example` to `.env.local` and add Firebase values.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Publish `firestore-rules/firestore.rules` in Firebase Console. Enable Email/Password authentication, then create the first administrator user document manually with `role: "admin"`.

## Sensor endpoint

`POST /api/sensors/{stationId}/reading` with header `X-Device-Key: <DEVICE_API_KEY>` and body `{"waterLevel":47,"rainfall":0}`.

The `wokwi` folder includes both `sketch.ino` and `diagram.json`. Create a new ESP32 project in Wokwi, replace its generated files with these two files, then replace the endpoint station ID and device key after deployment. The HC-SR04 is already connected as VCC→5V, GND→GND, Trig→GPIO 5, Echo→GPIO 18.

## Scope

This project deliberately uses Wokwi simulation rather than physical sensor hardware; provides no SMS/emergency dispatch; does not consume official agency feeds; and uses per-station alerts rather than basin-wide flood prediction.
