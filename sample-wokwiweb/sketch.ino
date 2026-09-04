/* FloodWatch online Wokwi test sketch. Change endpoint/key before running. */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* API_ENDPOINT = "https://floodwatchlive.vercel.app/api/sensors/8q4KBKLwbTt4ubN8Bni5/reading";
const char* DEVICE_API_KEY = "flood-esp32-secret-key";
constexpr uint8_t TRIG_PIN = 5, ECHO_PIN = 18;
constexpr float STATION_HEIGHT_CM = 100.0F;
constexpr unsigned long INTERVAL_MS = 10000;
unsigned long lastReadingAt = 0;

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) delay(250);
  if (WiFi.status() != WL_CONNECTED) Serial.println("WiFi connection failed; retrying later.");
  return WiFi.status() == WL_CONNECTED;
}

float readWaterLevel() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN, LOW);
  const unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return NAN;
  const float distanceCm = duration * 0.0343F / 2.0F;
  Serial.printf("distance=%.1f cm, water level=%.1f cm\n", distanceCm, STATION_HEIGHT_CM - distanceCm);
  return constrain(STATION_HEIGHT_CM - distanceCm, 0.0F, STATION_HEIGHT_CM);
}

void postReading(float waterLevel) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, API_ENDPOINT)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  const int status = http.POST("{\"waterLevel\":" + String(waterLevel, 1) + ",\"rainfall\":0}");
  Serial.printf("POST %d\n", status);
  if (status < 200 || status >= 300) Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  WiFi.mode(WIFI_STA); ensureWiFi();
  lastReadingAt = millis() - INTERVAL_MS;
}

void loop() {
  if (millis() - lastReadingAt < INTERVAL_MS) return;
  lastReadingAt = millis();
  if (!ensureWiFi()) return;
  const float waterLevel = readWaterLevel();
  if (!isnan(waterLevel)) postReading(waterLevel);
}
