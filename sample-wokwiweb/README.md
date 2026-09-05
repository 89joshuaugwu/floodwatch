# FloodWatch Wokwi test project

Create a new ESP32 project on Wokwi and paste in this folder's `diagram.json`
and `sketch.ino`. Set `API_ENDPOINT` and `DEVICE_API_KEY` in the sketch to the
deployed app URL, station ID, and matching server-side device key before
starting the simulation.

The HC-SR04 starts at 50 cm. Click it in the running simulation and adjust
its **Distance** slider. Try 80, 50, then 20 cm: the measured water level is
20, 50, then 80 cm. Values at or above 100 cm all produce zero water level.
The serial monitor prints measurements each second and upload results every
10 seconds plus network time. `POST 201` means the server accepted a reading.

This folder is generated from `wokwi/`. Make shared edits there, then run
`npm run wokwi:sync` (or `npm run wokwi:build`) from the repository root.
For local simulation instructions, see [wokwi/README.md](../wokwi/README.md).
