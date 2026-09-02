/*
  FloodWatch - Wokwi Simulation
  ESP32 + HC-SR04 (water level, via distance-to-surface) + simulated rainfall

  HOW TO USE:
  1. Go to https://wokwi.com, create a new ESP32 project
  2. Paste this code into sketch.ino
  3. Wire HC-SR04: VCC->5V, GND->GND, Trig->GPIO 5, Echo->GPIO 18
     (mount facing down toward the water surface — distance DECREASES
     as water level RISES, remember to invert this in your reading logic)
  4. Update API_ENDPOINT below with your deployed Vercel URL and station ID
  5. Click the green Play button to run the simulation
  6. Use Wokwi's "Editing HC-SR04" panel to manually adjust the simulated
     distance and watch the dashboard respond in real time
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
  Serial.println("WiFi connected.");
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
