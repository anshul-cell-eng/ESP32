/*
  ==================================================================================
  SENTINEL — Smart LPG Safety Monitoring System
  Microcontroller: ESP32 DevKit (30-pin / 38-pin)
  Firmware Version: 1.2.0 (Cloud HTTPS Ingest & Local Failsafe)
  Tagline: Detect Early. Protect Every Life.
  ==================================================================================
  
  CIRCUIT PIN ASSIGNMENTS:
  ----------------------------------------------------------------------------------
  Component              ESP32 Pin     Type           Notes
  ----------------------------------------------------------------------------------
  MQ-2 Analog Out (AOUT) GPIO 34       Analog Input   ADC1_CH6 (Input-only, 0-3.3V)
  Relay Control IN       GPIO 13       Digital Output Active HIGH (Emergency Solenoid Cutoff)
  Active Buzzer          GPIO 14       Digital Output Active HIGH driven (Alarm Siren)
  RGB LED - Red          GPIO 25       Digital/PWM    Through 220 Ohm resistor
  RGB LED - Green        GPIO 26       Digital/PWM    Through 220 Ohm resistor
  RGB LED - Blue         GPIO 27       Digital/PWM    Through 220 Ohm resistor
  OLED SDA (Optional)    GPIO 21       I2C Data       0.96" SSD1306 (Optional)
  OLED SCL (Optional)    GPIO 22       I2C Clock      0.96" SSD1306 (Optional)
  ==================================================================================
*/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ==================================================================================
// 1. NETWORK & CLOUD INGESTION CONFIGURATION
// ==================================================================================
// Wi-Fi Credentials (replace with your local lab/home Wi-Fi network)
const char* WIFI_SSID     = "LAPTOP-SL0K8I9K 1489";
const char* WIFI_PASSWORD = "12345678q";

// Render Cloud Ingest URL (replace with your deployed Render backend service URL)
// Example: "https://sentinel-backend.onrender.com/api/ingest"
// For local testing on LAN: "http://192.168.1.150:8000/api/ingest"
const char* CLOUD_INGEST_URL = "https://sentinel-backend.onrender.com/api/ingest";

// Secret Device Authentication Token (must match SENTINEL_DEVICE_TOKEN on Render backend)
const char* DEVICE_AUTH_TOKEN = "sentinel_dev_secret_token_2026";

// Push telemetry interval to cloud (milliseconds)
const unsigned long CLOUD_PUSH_INTERVAL_MS = 1000;

// Device Identity & Firmware Version
const char* DEVICE_ID        = "HC001";
const char* FIRMWARE_VERSION = "1.2.0";

// ==================================================================================
// 2. HARDWARE PIN DEFINITIONS
// ==================================================================================
const int PIN_MQ2_ADC     = 34;  // GPIO 34 (ADC1_CH6)
const int PIN_RELAY       = 13;  // GPIO 13 (Emergency Cutoff Solenoid)
const int PIN_BUZZER      = 14;  // GPIO 14 (Active Alarm Buzzer)
const int PIN_LED_RED     = 25;  // GPIO 25 (RGB Red)
const int PIN_LED_GREEN   = 26;  // GPIO 26 (RGB Green)
const int PIN_LED_BLUE    = 27;  // GPIO 27 (RGB Blue)

// Calibration Demonstration Thresholds
const int THRESHOLD_SAFE_LIMIT     = 1500;  // Below 1500 = SAFE
const int THRESHOLD_CRITICAL_LIMIT = 2000;  // Above 2000 = CRITICAL

// Local HTTP Server on Port 80 (For Local LAN Fallback & Diagnostics)
WebServer server(80);

// Hardware State Registers
volatile int currentGasAdc       = 0;
String currentGasStatus          = "SAFE";
bool relayActive                 = false;
bool buzzerActive                = false;
unsigned long readingSequence    = 0;
unsigned long lastSampleTime     = 0;
unsigned long lastCloudPushTime  = 0;
unsigned long lastBuzzerToggle   = 0;
unsigned long lastSerialLog      = 0;
unsigned long lastWifiRetry      = 0;
bool buzzerToggleState           = false;
bool serverStarted               = false;

// Forward Declarations
void handleGetStatus();
void handleGetHealth();
void handleNotFound();
void setRgbColor(bool r, bool g, bool b);
void sampleHardware();
void checkWifiConnection();
void pushTelemetryToCloud();

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  SENTINEL — Smart LPG Safety Monitoring System   "));
  Serial.println(F("  Firmware v1.2.0 (Cloud HTTPS Ingest Enabled)    "));
  Serial.println(F("=================================================="));

  // Configure GPIO Pins
  pinMode(PIN_MQ2_ADC, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);

  // Initial Safe Actuator Defaults
  digitalWrite(PIN_RELAY, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  setRgbColor(false, false, true); // Blue = Initializing

  // Configure ADC (12-bit, 0-4095 range, 11dB attenuation for ~3.3V full scale)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Connect to Wi-Fi Network
  Serial.print(F("Connecting to Wi-Fi SSID: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Connection attempts (20 attempts x 500ms = 10 seconds)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println(F(">>> Wi-Fi Connected Successfully! <<<"));
    Serial.print(F(">>> Assigned Local IP: http://"));
    Serial.println(WiFi.localIP());
    Serial.print(F(">>> Cloud Ingestion Target: "));
    Serial.println(CLOUD_INGEST_URL);
    setRgbColor(false, true, false); // Green = Operational
  } else {
    Serial.println();
    Serial.println(F("Wi-Fi Connection Pending/Timed out."));
    Serial.println(F("Running autonomous local failsafe. Background reconnect active."));
    setRgbColor(true, true, false); // Yellow = Autonomous Failsafe
  }

  // Register Local Diagnostic Web Server Endpoints
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.on("/api/health", HTTP_GET, handleGetHealth);
  server.onNotFound(handleNotFound);
  server.enableCORS(true);
  server.begin();
  serverStarted = true;
  Serial.println(F("Local HTTP diagnostic server listening on port 80"));
}

void loop() {
  // 1. Process local HTTP diagnostic server requests
  if (serverStarted) {
    server.handleClient();
  }

  // 2. Autonomous Local Safety Loop (100ms non-blocking cadence)
  // Cuts off gas solenoid and alarms locally even if Wi-Fi or Cloud is offline
  unsigned long now = millis();
  if (now - lastSampleTime >= 100) {
    lastSampleTime = now;
    sampleHardware();
  }

  // 3. Authenticated HTTPS Cloud Telemetry Ingestion (Every 1000ms)
  if (now - lastCloudPushTime >= CLOUD_PUSH_INTERVAL_MS) {
    lastCloudPushTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      pushTelemetryToCloud();
    }
  }

  // 4. Background Wi-Fi monitor & auto-reconnect every 5 seconds
  if (now - lastWifiRetry >= 5000) {
    lastWifiRetry = now;
    checkWifiConnection();
  }

  // 5. Periodic Serial debug telemetry stream every 2 seconds
  if (now - lastSerialLog >= 2000) {
    lastSerialLog = now;
    Serial.print(F("[SENTINEL] ADC: "));
    Serial.print(currentGasAdc);
    Serial.print(F(" | Status: "));
    Serial.print(currentGasStatus);
    Serial.print(F(" | Relay: "));
    Serial.print(relayActive ? F("CUTOFF(ON)") : F("PASS(OFF)"));
    Serial.print(F(" | Wi-Fi: "));
    Serial.println(WiFi.status() == WL_CONNECTED ? F("CONNECTED") : F("OFFLINE"));
  }
}

// Background non-blocking Wi-Fi reconnect
void checkWifiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }
}

// Read MQ-2 and enforce local hardware safety logic in under 100ms
void sampleHardware() {
  readingSequence++;
  
  // Multi-sample smoothing over 5 samples to reduce ADC noise
  long adcSum = 0;
  for (int i = 0; i < 5; i++) {
    adcSum += analogRead(PIN_MQ2_ADC);
    delayMicroseconds(50);
  }
  currentGasAdc = adcSum / 5;

  // Local Autonomous Failsafe Logic
  if (currentGasAdc > THRESHOLD_CRITICAL_LIMIT) {
    // CRITICAL: Cut off gas solenoid, sound continuous alarm, Red LED
    currentGasStatus = "CRITICAL";
    relayActive = true;
    buzzerActive = true;
    digitalWrite(PIN_RELAY, HIGH);
    digitalWrite(PIN_BUZZER, HIGH);
    setRgbColor(true, false, false); // Red
  } else if (currentGasAdc >= THRESHOLD_SAFE_LIMIT) {
    // WARNING: Gas detected, relay inactive, intermittent warning chirp, Yellow LED
    currentGasStatus = "WARNING";
    relayActive = false;
    digitalWrite(PIN_RELAY, LOW);

    // Pulse buzzer every 300ms
    if (millis() - lastBuzzerToggle >= 300) {
      lastBuzzerToggle = millis();
      buzzerToggleState = !buzzerToggleState;
      digitalWrite(PIN_BUZZER, buzzerToggleState ? HIGH : LOW);
    }
    buzzerActive = true;
    setRgbColor(true, true, false); // Yellow / Amber
  } else {
    // SAFE: Normal atmospheric air, all actuators idle, Green LED
    currentGasStatus = "SAFE";
    relayActive = false;
    buzzerActive = false;
    digitalWrite(PIN_RELAY, LOW);
    digitalWrite(PIN_BUZZER, LOW);
    if (WiFi.status() == WL_CONNECTED) {
      setRgbColor(false, true, false); // Green = Operational
    } else {
      setRgbColor(true, true, false);  // Amber = Autonomous Failsafe
    }
  }
}

// Push live telemetry packet to the public Render backend via authenticated HTTPS
void pushTelemetryToCloud() {
  HTTPClient http;
  String urlStr = String(CLOUD_INGEST_URL);
  
  bool isHttps = urlStr.startsWith("https://");
  
  if (isHttps) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Allows secure TLS communication with Render certificates
    http.begin(secureClient, urlStr);
  } else {
    WiFiClient plainClient;
    http.begin(plainClient, urlStr);
  }

  // Request Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_TOKEN);
  http.addHeader("User-Agent", "SENTINEL-ESP32-Firmware/1.2.0");
  http.setTimeout(2500);

  // Assemble JSON Payload matching backend DeviceStatusPayload schema
  unsigned long uptimeSec = millis() / 1000;
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"gasAdc\":" + String(currentGasAdc) + ",";
  json += "\"gasStatus\":\"" + currentGasStatus + "\",";
  json += "\"relayState\":" + String(relayActive ? "true" : "false") + ",";
  json += "\"buzzerState\":" + String(buzzerActive ? "true" : "false") + ",";
  json += "\"temperatureC\":null,";
  json += "\"humidityPercent\":null,";
  json += "\"mode\":\"LIVE\",";
  json += "\"uptimeSeconds\":" + String(uptimeSec) + ",";
  json += "\"sequence\":" + String(readingSequence) + ",";
  json += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\"";
  json += "}";

  int httpCode = http.POST(json);
  if (httpCode > 0) {
    if (httpCode == 200 || httpCode == 201) {
      // Successfully ingested
    } else if (httpCode == 401) {
      Serial.println(F("[WARN] Cloud Ingest Rejected: Invalid X-Device-Token!"));
    } else {
      Serial.print(F("[WARN] Cloud Ingest HTTP Code: "));
      Serial.println(httpCode);
    }
  } else {
    // Negative error codes (e.g. -1 connection failed)
    // Only log periodically to avoid filling serial buffer
    if (readingSequence % 10 == 0) {
      Serial.print(F("[INFO] Cloud Ingest attempt pending: "));
      Serial.println(http.errorToString(httpCode));
    }
  }

  http.end();
}

// Local GET /api/status - Returns full telemetry payload in strict JSON format
void handleGetStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
  unsigned long uptimeSec = millis() / 1000;
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"gasAdc\":" + String(currentGasAdc) + ",";
  json += "\"gasStatus\":\"" + currentGasStatus + "\",";
  json += "\"relayState\":" + String(relayActive ? "true" : "false") + ",";
  json += "\"buzzerState\":" + String(buzzerActive ? "true" : "false") + ",";
  json += "\"temperatureC\":null,";
  json += "\"humidityPercent\":null,";
  json += "\"mode\":\"LIVE\",";
  json += "\"uptimeSeconds\":" + String(uptimeSec) + ",";
  json += "\"sequence\":" + String(readingSequence) + ",";
  json += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\",";
  json += "\"timestamp\":\"" + String(uptimeSec) + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// Local GET /api/health - Diagnostic endpoint without actuator changes
void handleGetHealth() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
  unsigned long uptimeSec = millis() / 1000;
  String json = "{";
  json += "\"status\":\"ONLINE\",";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"firmware\":\"" + String(FIRMWARE_VERSION) + "\",";
  json += "\"uptimeSeconds\":" + String(uptimeSec) + ",";
  json += "\"wifiRssi\":" + String(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0);
  json += "}";

  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(404, "application/json", "{\"error\":\"Endpoint not found\"}");
}

// Helper to set common cathode RGB LED
void setRgbColor(bool r, bool g, bool b) {
  digitalWrite(PIN_LED_RED, r ? HIGH : LOW);
  digitalWrite(PIN_LED_GREEN, g ? HIGH : LOW);
  digitalWrite(PIN_LED_BLUE, b ? HIGH : LOW);
}
