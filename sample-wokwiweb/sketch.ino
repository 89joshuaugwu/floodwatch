/* FloodWatch ESP32 simulation. HC-SR04 distance is measured down to water. */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
// Set these to your deployed app URL, station ID, and DEVICE_API_KEY.
// For your local website with the VS Code gateway, use:
// http://host.wokwi.internal:3000/api/sensors/8q4KBKLwbTt4ubN8Bni5/reading
const char* API_ENDPOINT = "https://floodwatchlive.vercel.app/api/sensors/8q4KBKLwbTt4ubN8Bni5/reading";
const char* DEVICE_API_KEY = "flood-esp32-secret-key";

constexpr uint8_t TRIG_PIN = 5;
constexpr uint8_t ECHO_PIN = 18;
constexpr float STATION_HEIGHT_CM = 100.0F;
constexpr unsigned long READ_INTERVAL_MS = 1000;
constexpr unsigned long UPLOAD_INTERVAL_MS = 10000;
constexpr unsigned long WIFI_TIMEOUT_MS = 15000;
unsigned long lastReadTime = 0;
QueueHandle_t readingsToUpload = nullptr;

bool connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
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
    Serial.println("No echo: check TRIG -> esp:5 and ECHO -> esp:18 in diagram.json.");
    return NAN;
  }
  // Wokwi's HC-SR04 uses 58 microseconds per centimeter.
  const float distanceCm = duration / 58.0F;
  const float waterLevelCm = constrain(STATION_HEIGHT_CM - distanceCm, 0.0F, STATION_HEIGHT_CM);
  Serial.printf("distance=%.1f cm, water level=%.1f cm\n", distanceCm, waterLevelCm);
  if (distanceCm >= STATION_HEIGHT_CM) {
    Serial.println("Water level is 0 at distances >= 100 cm. Try 80, 50, then 20 cm.");
  }
  return waterLevelCm;
}

void sendReading(float waterLevelCm) {
  WiFiClient plainClient;
  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Demo only; use a trusted CA for real hardware.
  secureClient.setHandshakeTimeout(10);
  WiFiClient& client = String(API_ENDPOINT).startsWith("https://")
    ? static_cast<WiFiClient&>(secureClient) : plainClient;
  HTTPClient http;
  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  if (!http.begin(client, API_ENDPOINT)) {
    Serial.println("Could not start HTTPS request.");
    return;
  }
  const String payload = "{\"waterLevel\":" + String(waterLevelCm, 1) + ",\"rainfall\":0}";
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  const int statusCode = http.POST(payload);
  Serial.printf("Upload %.1f cm: POST %d\n", waterLevelCm, statusCode);
  if (statusCode <= 0) {
    Serial.println(HTTPClient::errorToString(statusCode));
    Serial.println("Check the Wokwi IoT gateway, network, and API endpoint.");
  } else {
    Serial.println(http.getString());
    if (statusCode == 401) Serial.println("Device key does not match the server.");
    if (statusCode == 404) Serial.println("Station ID or API route was not found.");
    if (statusCode >= 500) Serial.println("Server error: check the website's server logs.");
  }
  http.end();
}

void uploadReadings(void*) {
  float waterLevelCm;
  bool uploadedOnce = false;
  unsigned long lastUploadTime = 0;
  for (;;) {
    if (xQueueReceive(readingsToUpload, &waterLevelCm, portMAX_DELAY) != pdTRUE) continue;
    if (uploadedOnce) {
      const unsigned long elapsed = millis() - lastUploadTime;
      if (elapsed < UPLOAD_INTERVAL_MS) delay(UPLOAD_INTERVAL_MS - elapsed);
    }
    if (!connectToWiFi()) continue;
    // Only upload the newest measurement after a slow connection or request.
    xQueueReceive(readingsToUpload, &waterLevelCm, 0);
    sendReading(waterLevelCm);
    lastUploadTime = millis();
    uploadedOnce = true;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nFloodWatch firmware - built " __DATE__ " " __TIME__);
  Serial.printf("Endpoint: %s\n", API_ENDPOINT);
  Serial.println("Sensor: every 1 second; upload: every 10 seconds plus network time.");
  Serial.println("Change the running HC-SR04 Distance slider (80 -> 20 cm water; 20 -> 80 cm water).");
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  WiFi.mode(WIFI_STA);
  readingsToUpload = xQueueCreate(1, sizeof(float));
  if (!readingsToUpload || xTaskCreate(uploadReadings, "flood-upload", 8192, nullptr, 1, nullptr) != pdPASS) {
    Serial.println("Could not start uploader; restart the simulation.");
    if (readingsToUpload) vQueueDelete(readingsToUpload);
    readingsToUpload = nullptr;
  }
  lastReadTime = millis() - READ_INTERVAL_MS; // send one reading immediately
}

void loop() {
  // Yield CPU time to WiFi and the uploader, even between sensor samples.
  delay(10);
  if (millis() - lastReadTime < READ_INTERVAL_MS) return;
  lastReadTime = millis();
  const float waterLevelCm = readWaterLevelCm();
  // The sensor keeps responding to changes while network requests are waiting.
  if (!isnan(waterLevelCm) && readingsToUpload) xQueueOverwrite(readingsToUpload, &waterLevelCm);
}
