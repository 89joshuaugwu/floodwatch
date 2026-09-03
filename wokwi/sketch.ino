#include <WiFi.h>
#include <HTTPClient.h>
const char* WIFI_SSID="Wokwi-GUEST"; const char* WIFI_PASSWORD="";
const char* API_ENDPOINT="https://YOUR-APP.vercel.app/api/sensors/YOUR-STATION-ID/reading";
const char* DEVICE_API_KEY="replace-with-your-device-api-key";
#define TRIG_PIN 5
#define ECHO_PIN 18
#define STATION_HEIGHT_CM 100
const unsigned long READ_INTERVAL_MS=10000; unsigned long lastReadTime=0;
void setup(){Serial.begin(115200);pinMode(TRIG_PIN,OUTPUT);pinMode(ECHO_PIN,INPUT);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);while(WiFi.status()!=WL_CONNECTED)delay(500);}
void loop(){if(millis()-lastReadTime>=READ_INTERVAL_MS){lastReadTime=millis();digitalWrite(TRIG_PIN,LOW);delayMicroseconds(2);digitalWrite(TRIG_PIN,HIGH);delayMicroseconds(10);digitalWrite(TRIG_PIN,LOW);long duration=pulseIn(ECHO_PIN,HIGH);float distanceCm=duration*.0343/2;float waterLevelCm=STATION_HEIGHT_CM-distanceCm;sendReading(waterLevelCm);}}
void sendReading(float waterLevelCm){HTTPClient http;http.begin(API_ENDPOINT);http.addHeader("Content-Type","application/json");http.addHeader("X-Device-Key",DEVICE_API_KEY);String payload="{\"waterLevel\":"+String(waterLevelCm)+",\"rainfall\":0}";Serial.println(http.POST(payload));http.end();}
