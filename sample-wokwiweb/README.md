# FloodWatch Wokwi test project

Create a new ESP32 project on Wokwi and paste in this folder's `diagram.json`
and `sketch.ino`. Set `API_ENDPOINT` and `DEVICE_API_KEY` in the sketch to the
deployed app URL, station ID, and matching server-side device key before
starting the simulation.

The HC-SR04 starts at 50 cm. While it runs, edit its **Distance** property:
a smaller distance means a higher reported water level. The serial monitor
prints the HTTP status for every 10-second update.
