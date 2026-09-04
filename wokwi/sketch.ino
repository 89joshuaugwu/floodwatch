/* FloodWatch ESP32 simulation. HC-SR04 distance is measured down to water. */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
// Set these to your deployed app URL, station ID, and DEVICE_API_KEY.
const char* API_ENDPOINT = "https://floodwatchlive.vercel.app/api/sensors/8q4KBKLwbTt4ubN8Bni5/reading";
const char* DEVICE_API_KEY = "flood-esp32-secret-key";

constexpr uint8_t TRIG_PIN = 5;
constexpr uint8_t ECHO_PIN = 18;
constexpr float STATION_HEIGHT_CM = 100.0F;
constexpr unsigned long READ_INTERVAL_MS = 10000;
constexpr unsigned long WIFI_TIMEOUT_MS = 15000;
unsigned long lastReadTime = 0;

bool connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection timed out; retrying on the next reading.");
    return false;
  }
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
  return true;
}

float readWaterLevelCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  const unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) {
    Serial.println("No ultrasonic echo received; skipping reading.");
    return NAN;
  }
  const float distanceCm = duration * 0.0343F / 2.0F;
  const float waterLevelCm = constrain(STATION_HEIGHT_CM - distanceCm, 0.0F, STATION_HEIGHT_CM);
  Serial.printf("distance=%.1f cm, water level=%.1f cm\n", distanceCm, waterLevelCm);
  return waterLevelCm;
}

void sendReading(float waterLevelCm) {
  WiFiClientSecure client;
  client.setInsecure(); // HTTPS encryption without a CA bundle in this demo.
  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, API_ENDPOINT)) {
    Serial.println("Could not start HTTPS request.");
    return;
  }
  const String payload = "{\"waterLevel\":" + String(waterLevelCm, 1) + ",\"rainfall\":0}";
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  const int statusCode = http.POST(payload);
  Serial.printf("POST %d\n", statusCode);
  if (statusCode < 200 || statusCode >= 300) Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  WiFi.mode(WIFI_STA);
  connectToWiFi();
  lastReadTime = millis() - READ_INTERVAL_MS; // send one reading immediately
}

void loop() {
  if (millis() - lastReadTime < READ_INTERVAL_MS) return;
  lastReadTime = millis();
  if (!connectToWiFi()) return;
  const float waterLevelCm = readWaterLevelCm();
  if (!isnan(waterLevelCm)) sendReading(waterLevelCm);
}
