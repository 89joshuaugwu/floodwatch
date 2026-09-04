/*
  FloodWatch - Wokwi Simulation
  ESP32 + HC-SR04 (water level, via distance-to-surface) + simulated rainfall
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* API_ENDPOINT = "https://floodwatchlive.vercel.app/api/sensors/[stationId]/reading";
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
    float waterLevelCm = STATION_HEIGHT_CM - distanceCm;

    sendReading(waterLevelCm);
  }
}

void sendReading(float waterLevelCm) {
  WiFiClientSecure client;
  client.setInsecure(); // skip cert validation — fine for this demo

  HTTPClient http;
  http.begin(client, API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  String payload = "{\"waterLevel\":" + String(waterLevelCm) +
                    ",\"rainfall\":0}";

  int code = http.POST(payload);
  Serial.print("POST response code: ");
  Serial.println(code);
  http.end();
}
