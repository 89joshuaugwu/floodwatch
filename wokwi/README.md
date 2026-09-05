# Run FloodWatch locally

From the FloodWatch project root, run:

```powershell
npm run wokwi:build
```

This finds PlatformIO even when it is installed by VS Code rather than on
your PATH, updates the standalone online sample from `wokwi/`, and compiles
`wokwi/.pio/build/esp32dev/firmware.bin`. You can also press Ctrl+Shift+B in
VS Code and select **FloodWatch: Build Wokwi firmware**.

1. Stop any running Wokwi simulation after the build succeeds.
2. Run **Wokwi: Select Config File** and choose `wokwi/wokwi.toml` if your
   workspace is the FloodWatch root. Opening `wokwi/` as its own VS Code
   folder also works.
3. Run **Wokwi: Start Simulator**. Check the firmware build time printed in
   the serial monitor; editing an `.ino` file alone does not rebuild it.
4. Keep the simulator tab visible. Click the HC-SR04 sensor in the running
   diagram and change its **Distance** slider. Editing `diagram.json` changes
   the initial distance on the next simulation start.
5. Try distances **80**, **50**, then **20** cm. The serial monitor should
   report water levels **20**, **50**, then **80** cm each second. Uploads
   happen every 10 seconds plus network time. `POST 201` confirms acceptance.
6. Open the station URL matching the ID in `API_ENDPOINT`:
   `https://floodwatchlive.vercel.app/stations/8q4KBKLwbTt4ubN8Bni5`.

The sensor is mounted 100 cm above the riverbed in this demo, so
`waterLevel = max(0, 100 - distance)`. Distances at or above 100 cm all report
zero. Rainfall is fixed at zero; there is no rainfall sensor in this circuit.
GPIO identifiers on this particular board are `esp:5` and `esp:18`, not
`esp:D5` / `esp:D18`.

## Use the local website

Run `npm run dev` from the repository root. In `wokwi/sketch.ino`, change
`API_ENDPOINT` to:

```text
http://host.wokwi.internal:3000/api/sensors/8q4KBKLwbTt4ubN8Bni5/reading
```

Use a station ID that exists in your Firebase project and a device key that
matches `.env.local`. Rebuild and restart Wokwi. The VS Code extension's
bundled IoT gateway resolves `host.wokwi.internal` to your computer; ESP32
`localhost` points to the simulated ESP32 itself. The firmware supports HTTP
for local testing and HTTPS for deployment. The default endpoint uses the
deployed website, so running Next locally is not required for that mode.

The local simulator can keep measuring if its network gateway is down. The
website still needs internet access to Firebase. Availability of the local
Wokwi simulator itself depends on your installed extension and Wokwi license.

## Diagnose a stopped feed

```powershell
npm run sensor:diagnose
# Or check a running local web server:
npm run sensor:diagnose -- http://localhost:3000
```

This checks matching configuration, the website, device authentication, public
station access, and the last stored reading. Its API probe sends an invalid
negative reading and expects HTTP 400; it does not save test readings.

| Serial output | Meaning |
| --- | --- |
| No echo | Sensor wiring is disconnected or the wrong diagram is selected. |
| POST 201 | Reading accepted; check the same station's last-updated time. |
| POST 401 | Sketch device key differs from the server's key. |
| POST 404 | Wrong API URL or station ID. |
| POST 500 or above | Inspect the web server logs/Firebase credentials. |
| Negative POST code | Gateway, DNS, connection, or TLS failure; measurements continue locally. |

Reference: [Wokwi project configuration](https://docs.wokwi.com/vscode/project-config),
[ESP32 networking](https://docs.wokwi.com/guides/esp32-wifi), and
[board pin definition](https://github.com/wokwi/wokwi-boards/blob/main/boards/esp32-devkit-c-v4/board.json).
