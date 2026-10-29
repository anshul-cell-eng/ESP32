/*
  ==================================================================================
  SENTINEL — Smart LPG Safety Monitoring System
  Microcontroller: ESP32 DevKit (30-pin / 38-pin)
  Firmware Version: 1.3.0 (Dual-Core Failsafe, Hardware Preserved, HTTPS Cloud Ingest)
  Tagline: Detect Early. Protect Every Life.
  ==================================================================================
  
  CIRCUIT PIN ASSIGNMENTS (STRICTLY PRESERVED):
  ----------------------------------------------------------------------------------
  Component              ESP32 Pin     Type           Electrical Configuration
  ----------------------------------------------------------------------------------
  MQ-2 Analog Out (AOUT) GPIO 34       Analog Input   ADC1_CH6 (Input-only, 0-3.3V)
  RGB LED - Red          GPIO 27       Digital Output Common-Anode (Active-LOW: LOW=ON)
  RGB LED - Green        GPIO 26       Digital Output Common-Anode (Active-LOW: LOW=ON)
  RGB LED - Blue         GPIO 25       Digital Output Common-Anode (Active-LOW: LOW=ON)
  Relay Control IN       GPIO 33       Digital Output Active-LOW (LOW=Energized/Cutoff)
  Active Buzzer          GPIO 13       Digital Output Active-HIGH (HIGH=Sounding, LOW=Mute)
  Silence Switch         GPIO 35       Digital Input  Input-only (External Pull-Up/Down)
  OLED I2C SDA           GPIO 32       I2C Data       0.96" SSD1306 (128x64, Addr 0x3C)
  OLED I2C SCL           GPIO 14       I2C Clock      0.96" SSD1306 (128x64, Addr 0x3C)
  Serial Interface       TX/RX0        UART           115200 Baud
  ==================================================================================
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>

#include "certs.h"

// Include optional private local configuration if present
#if __has_include("config.h")
  #include "config.h"
#endif

// ==================================================================================
// 1. CONFIGURATION & FALLBACK DEFAULTS
// ==================================================================================
#ifndef SENTINEL_WIFI_SSID
  #define SENTINEL_WIFI_SSID "LAPTOP-SL0K8I9K 1489"
#endif

#ifndef SENTINEL_WIFI_PASSWORD
  #define SENTINEL_WIFI_PASSWORD "12345678q"
#endif

// Backend Ingestion URL
// Priority: Cloud Render endpoint, with easy toggle for local LAN backend
#ifndef SENTINEL_INGEST_URL
  #define SENTINEL_INGEST_URL "https://sentinel-backend.onrender.com/api/ingest"
#endif

#ifndef SENTINEL_DEVICE_ID
  #define SENTINEL_DEVICE_ID "HC001"
#endif

#ifndef SENTINEL_DEVICE_TOKEN
  #define SENTINEL_DEVICE_TOKEN "sentinel_dev_secret_token_2026"
#endif

#ifndef SENTINEL_PUSH_INTERVAL_MS
  #define SENTINEL_PUSH_INTERVAL_MS 1000
#endif

// Silence Switch Active State:
// GPIO 35 has no internal pull resistors.
// Default wiring assumption: External 10k pull-up to 3.3V, momentary switch to GND -> LOW when pressed.
// If wired with pull-down to GND and switch to 3.3V -> set to HIGH in config.h.
#ifndef SILENCE_SWITCH_ACTIVE_LEVEL
  #define SILENCE_SWITCH_ACTIVE_LEVEL LOW
#endif

const char* FIRMWARE_VERSION = "1.3.0";

// ==================================================================================
// 2. HARDWARE PIN DEFINITIONS (EXACT SPECIFICATION)
// ==================================================================================
const int PIN_MQ2_ADC     = 34;  // MQ-2 Analog Input (ADC1_CH6)
const int PIN_LED_RED     = 27;  // RGB Red (Common-Anode, Active-LOW)
const int PIN_LED_GREEN   = 26;  // RGB Green (Common-Anode, Active-LOW)
const int PIN_LED_BLUE    = 25;  // RGB Blue (Common-Anode, Active-LOW)
const int PIN_RELAY       = 33;  // Relay Control (Active-LOW: LOW=Energized, HIGH=De-energized)
const int PIN_BUZZER      = 13;  // Active Buzzer (Active-HIGH: HIGH=Sounding)
const int PIN_SWITCH      = 35;  // Silence Switch (Input-only)
const int PIN_OLED_SDA    = 32;  // OLED I2C SDA
const int PIN_OLED_SCL    = 14;  // OLED I2C SCL

// Safety Thresholds
const int THRESHOLD_SAFE_LIMIT     = 1500;  // Below 1500 = SAFE
const int THRESHOLD_CRITICAL_LIMIT = 2000;  // 2000 and above = CRITICAL

// OLED Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_I2C_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledPresent = false;

// Local HTTP Server on Port 80 (For Local LAN Fallback & Diagnostics)
WebServer server(80);

// ==================================================================================
// 3. THREAD-SAFE STATE REGISTERS & CONTROL FLAGS
// ==================================================================================
portMUX_TYPE stateMux = portMUX_INITIALIZER_UNLOCKED;

volatile int currentGasAdc          = 0;
String currentGasStatus             = "SAFE";
volatile bool relayActive           = false;  // Logical state: true=energized/tripped, false=normal
volatile bool buzzerActive          = false;  // Actual physical output state: true=sounding, false=silent
volatile bool alarmSilenced         = false;  // Latched silence state by user switch
volatile unsigned long seqNumber    = 0;

// Switch debouncing state
int lastSwitchReading               = !SILENCE_SWITCH_ACTIVE_LEVEL;
unsigned long lastDebounceTime      = 0;
const unsigned long DEBOUNCE_DELAY  = 50;     // 50ms debounce

// Timing & Cadence
unsigned long lastSafetySampleTime  = 0;
unsigned long lastOledUpdateTime    = 0;
unsigned long lastSerialLogTime     = 0;
unsigned long lastBuzzerToggleTime  = 0;
bool buzzerToggleState              = false;

// Forward Declarations
void sampleHardware();
void updateActuators();
void checkSilenceSwitch();
void updateOledDisplay();
void setRgbColor(bool r, bool g, bool b);
void networkTask(void* pvParameters);
void handleGetStatus();
void handleGetHealth();
void handleNotFound();
String getIsoTimestamp();

// ==================================================================================
// 4. SETUP
// ==================================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("=================================================================="));
  Serial.println(F("  SENTINEL — Smart LPG Safety Monitoring System                   "));
  Serial.println(F("  Firmware v1.3.0 (Dual-Core Failsafe, Preserved Hardware Pins)  "));
  Serial.println(F("=================================================================="));

  // 1. Configure Pin Modes
  pinMode(PIN_MQ2_ADC, INPUT);
  pinMode(PIN_SWITCH, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);

  // 2. Set Safe Power-On Defaults
  // Active-LOW relay: HIGH = de-energized (normal gas pass, valve open)
  digitalWrite(PIN_RELAY, HIGH);
  // Active buzzer: LOW = silent
  digitalWrite(PIN_BUZZER, LOW);
  // Common-anode RGB LED: Blue ON during boot
  setRgbColor(false, false, true);

  // 3. Configure ADC (12-bit 0-4095, 11dB attenuation for ~3.3V range)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // 4. Initialize I2C and OLED Display on GPIO 32 (SDA) and GPIO 14 (SCL)
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
    oledPresent = true;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(14, 10);
    display.println(F("SENTINEL SYSTEM"));
    display.setCursor(14, 26);
    display.println(F("LPG SAFETY MONITOR"));
    display.setCursor(14, 44);
    display.println(F("Initializing..."));
    display.display();
    Serial.println(F("[HW] OLED SSD1306 (128x64) initialized successfully at 0x3C"));
  } else {
    oledPresent = false;
    Serial.println(F("[HW] OLED display not detected at 0x3C; continuing in headless mode."));
  }

  // 5. Initial hardware sample to establish baseline
  sampleHardware();

  // 6. Launch Dedicated Network Task on Core 0
  // Isolates Wi-Fi, HTTP server, and cloud ingestion from the safety-critical Core 1 loop
  xTaskCreatePinnedToCore(
    networkTask,        // Function pointer
    "SENTINEL_NetTask", // Task name
    8192,               // Stack size (bytes)
    NULL,               // Parameters
    1,                  // Priority
    NULL,               // Task handle
    0                   // Pin to Core 0
  );

  Serial.println(F("[SYSTEM] Core 1: Local Safety Loop running (50ms interval)."));
  Serial.println(F("[SYSTEM] Core 0: Network Ingestion Task active."));
}

// ==================================================================================
// 5. MAIN CORE 1 LOOP — SAFETY CRITICAL (NEVER BLOCKED BY NETWORK)
// ==================================================================================
void loop() {
  unsigned long now = millis();

  // 1. High-frequency Hardware Safety Loop (50ms cadence)
  if (now - lastSafetySampleTime >= 50) {
    lastSafetySampleTime = now;
    checkSilenceSwitch();
    sampleHardware();
    updateActuators();
  }

  // 2. OLED Display Refresh (250ms cadence)
  if (now - lastOledUpdateTime >= 250) {
    lastOledUpdateTime = now;
    if (oledPresent) {
      updateOledDisplay();
    }
  }

  // 3. Serial Telemetry Stream (2000ms cadence)
  if (now - lastSerialLogTime >= 2000) {
    lastSerialLogTime = now;
    Serial.print(F("[SENTINEL] ADC: "));
    Serial.print(currentGasAdc);
    Serial.print(F(" | Status: "));
    Serial.print(currentGasStatus);
    Serial.print(F(" | Relay: "));
    Serial.print(relayActive ? F("ENERGIZED(CUTOFF)") : F("DE-ENERGIZED(PASS)"));
    Serial.print(F(" | Buzzer: "));
    Serial.print(buzzerActive ? F("SOUNDING") : (alarmSilenced ? F("SILENCED") : F("OFF")));
    Serial.print(F(" | Switch: "));
    Serial.print(alarmSilenced ? F("MUTED") : F("IDLE"));
    Serial.print(F(" | Wi-Fi: "));
    Serial.print(WiFi.status() == WL_CONNECTED ? F("CONNECTED (") : F("OFFLINE"));
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print(WiFi.localIP());
      Serial.print(F(")"));
    }
    Serial.println();
  }
}

// ==================================================================================
// 6. HARDWARE SAMPLING & SAFETY LOGIC (CORE 1)
// ==================================================================================
void sampleHardware() {
  // Multi-sample smoothing across 8 samples to minimize ADC noise
  long adcSum = 0;
  for (int i = 0; i < 8; i++) {
    adcSum += analogRead(PIN_MQ2_ADC);
    delayMicroseconds(50);
  }
  int smoothedAdc = (int)(adcSum / 8);

  portENTER_CRITICAL(&stateMux);
  currentGasAdc = smoothedAdc;
  seqNumber++;

  if (currentGasAdc >= THRESHOLD_CRITICAL_LIMIT) {
    // CRITICAL: Gas exceeds 2000 ADC
    currentGasStatus = "CRITICAL";
    relayActive = true;  // Logical: relay activated (emergency cutoff)
  } else if (currentGasAdc >= THRESHOLD_SAFE_LIMIT) {
    // WARNING: Gas between 1500 and 1999 ADC
    currentGasStatus = "WARNING";
    relayActive = false; // Normal gas flow
  } else {
    // SAFE: Gas below 1500 ADC
    currentGasStatus = "SAFE";
    relayActive = false;
    alarmSilenced = false; // Auto-reset silence latch when environment recovers
  }
  portEXIT_CRITICAL(&stateMux);
}

// Actuator control: Relay, Active Buzzer, Common-Anode RGB LED
void updateActuators() {
  // 1. Relay Control (Active-LOW: LOW=Energized/Cutoff, HIGH=Normal Flow)
  if (relayActive) {
    digitalWrite(PIN_RELAY, LOW);   // Energize relay coil -> physical shutoff
  } else {
    digitalWrite(PIN_RELAY, HIGH);  // De-energize relay coil -> normal passage
  }

  // 2. Buzzer & RGB LED based on safety level and silence state
  if (currentGasStatus == "CRITICAL") {
    // CRITICAL: Continuous audible alarm (unless silenced), Red LED
    setRgbColor(true, false, false); // RED
    if (alarmSilenced) {
      digitalWrite(PIN_BUZZER, LOW);
      buzzerActive = false;
    } else {
      digitalWrite(PIN_BUZZER, HIGH);
      buzzerActive = true;
    }
  } else if (currentGasStatus == "WARNING") {
    // WARNING: Intermittent warning chirp (unless silenced), Amber LED
    setRgbColor(true, true, false); // AMBER / YELLOW
    if (alarmSilenced) {
      digitalWrite(PIN_BUZZER, LOW);
      buzzerActive = false;
    } else {
      // 300ms on, 300ms off pulse
      unsigned long now = millis();
      if (now - lastBuzzerToggleTime >= 300) {
        lastBuzzerToggleTime = now;
        buzzerToggleState = !buzzerToggleState;
      }
      digitalWrite(PIN_BUZZER, buzzerToggleState ? HIGH : LOW);
      buzzerActive = buzzerToggleState;
    }
  } else {
    // SAFE: Normal atmospheric air, actuators muted, Green LED
    digitalWrite(PIN_BUZZER, LOW);
    buzzerActive = false;
    if (WiFi.status() == WL_CONNECTED) {
      setRgbColor(false, true, false); // GREEN (Normal Operational)
    } else {
      // Slow breathing or soft yellow indicator for autonomous offline mode
      setRgbColor(false, true, true);  // CYAN (Autonomous Local Failsafe)
    }
  }
}

// Silence switch debouncing on GPIO 35
void checkSilenceSwitch() {
  int reading = digitalRead(PIN_SWITCH);

  if (reading != lastSwitchReading) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    if (reading == SILENCE_SWITCH_ACTIVE_LEVEL) {
      // Switch is pressed
      if (!alarmSilenced && (currentGasStatus == "WARNING" || currentGasStatus == "CRITICAL")) {
        alarmSilenced = true;
        Serial.println(F("[ACTION] Silence switch activated: Audible alarm muted."));
      }
    }
  }

  lastSwitchReading = reading;
}

// Helper: Common-Anode RGB LED (Active-LOW: LOW=ON, HIGH=OFF)
void setRgbColor(bool r, bool g, bool b) {
  digitalWrite(PIN_LED_RED,   r ? LOW : HIGH);
  digitalWrite(PIN_LED_GREEN, g ? LOW : HIGH);
  digitalWrite(PIN_LED_BLUE,  b ? LOW : HIGH);
}

// OLED Graphic Dashboard (128x64)
void updateOledDisplay() {
  display.clearDisplay();

  // Header Bar
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("SENTINEL"));
  display.setCursor(68, 0);
  if (WiFi.status() == WL_CONNECTED) {
    display.print(F("[ONLINE]"));
  } else {
    display.print(F("[OFFLINE]"));
  }
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Status Banner
  display.setCursor(0, 14);
  display.print(F("STATUS: "));
  display.setTextSize(1);
  if (currentGasStatus == "CRITICAL") {
    display.print(F("**CRITICAL**"));
  } else if (currentGasStatus == "WARNING") {
    display.print(F("*WARNING*"));
  } else {
    display.print(F("SAFE"));
  }

  // ADC Sensor Reading
  display.setCursor(0, 26);
  display.print(F("MQ-2 ADC: "));
  display.print(currentGasAdc);

  // Graphical Bar Gauge
  int barWidth = map(constrain(currentGasAdc, 0, 4095), 0, 4095, 0, 126);
  display.drawRect(0, 36, 128, 7, SSD1306_WHITE);
  display.fillRect(1, 37, barWidth, 5, SSD1306_WHITE);

  // Actuator States
  display.setCursor(0, 46);
  display.print(F("VALVE:"));
  display.print(relayActive ? F("SHUT") : F("OPEN"));
  display.setCursor(68, 46);
  display.print(F("ALARM:"));
  display.print(buzzerActive ? F("ON") : (alarmSilenced ? F("MUTE") : F("OFF")));

  // IP Address / Footer
  display.setCursor(0, 56);
  if (WiFi.status() == WL_CONNECTED) {
    display.print(WiFi.localIP());
  } else {
    display.print(F("WiFi Connecting..."));
  }

  display.display();
}

// ==================================================================================
// 7. CORE 0 NETWORK & INGESTION TASK (ASYNC, NON-BLOCKING)
// ==================================================================================
void networkTask(void* pvParameters) {
  Serial.print(F("[NET] Connecting to Wi-Fi SSID: "));
  Serial.println(SENTINEL_WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(SENTINEL_WIFI_SSID, SENTINEL_WIFI_PASSWORD);

  // Initial Wi-Fi connection timeout (15 attempts x 400ms = 6s)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    vTaskDelay(pdMS_TO_TICKS(400));
    Serial.print(F("."));
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("[NET] >>> Wi-Fi Connected Successfully! <<<"));
    Serial.print(F("[NET] >>> Local IP: http://"));
    Serial.println(WiFi.localIP());
    Serial.print(F("[NET] >>> Cloud Target: "));
    Serial.println(SENTINEL_INGEST_URL);

    // Initialize NTP UTC time synchronization
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  } else {
    Serial.println(F("[NET] Initial Wi-Fi timeout. Continuing autonomous local failsafe."));
    Serial.println(F("[NET] Background auto-reconnect active."));
  }

  // Register Local Diagnostic Web Server Endpoints
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.on("/api/health", HTTP_GET, handleGetHealth);
  server.onNotFound(handleNotFound);
  server.enableCORS(true);
  server.begin();
  Serial.println(F("[NET] Local HTTP server listening on port 80"));

  unsigned long lastPushTime = 0;
  unsigned long lastWifiCheck = 0;

  // Dedicated Core 0 Loop
  for (;;) {
    server.handleClient();

    unsigned long now = millis();

    // 1. Background Wi-Fi Watchdog & Reconnection
    if (now - lastWifiCheck >= 5000) {
      lastWifiCheck = now;
      if (WiFi.status() != WL_CONNECTED) {
        WiFi.reconnect();
      }
    }

    // 2. Authenticated Telemetry Push to Backend (Default: every 1000ms)
    if (now - lastPushTime >= SENTINEL_PUSH_INTERVAL_MS) {
      lastPushTime = now;
      if (WiFi.status() == WL_CONNECTED) {
        // Capture snapshot from shared registers
        portENTER_CRITICAL(&stateMux);
        int snapAdc        = currentGasAdc;
        String snapStatus  = currentGasStatus;
        bool snapRelay     = relayActive;
        bool snapBuzzer    = buzzerActive;
        unsigned long sNum = seqNumber;
        portEXIT_CRITICAL(&stateMux);

        HTTPClient http;
        String url = String(SENTINEL_INGEST_URL);
        bool isHttps = url.startsWith("https://");

        if (isHttps) {
          WiFiClientSecure secureClient;
          // Validates Let's Encrypt ISRG Root X1 certificate strictly
          secureClient.setCACert(ISRG_ROOT_X1_CA);
          http.begin(secureClient, url);
        } else {
          WiFiClient plainClient;
          http.begin(plainClient, url);
        }

        http.addHeader("Content-Type", "application/json");
        http.addHeader("X-Device-Token", SENTINEL_DEVICE_TOKEN);
        http.addHeader("User-Agent", "SENTINEL-ESP32-Firmware/1.3.0");
        http.setTimeout(2500);

        // Assemble JSON Telemetry Packet
        unsigned long uptimeSec = millis() / 1000;
        String isoTime = getIsoTimestamp();

        String json = "{";
        json += "\"deviceId\":\"" + String(SENTINEL_DEVICE_ID) + "\",";
        json += "\"gasAdc\":" + String(snapAdc) + ",";
        json += "\"gasStatus\":\"" + snapStatus + "\",";
        json += "\"relayState\":" + String(snapRelay ? "true" : "false") + ",";
        json += "\"buzzerState\":" + String(snapBuzzer ? "true" : "false") + ",";
        json += "\"temperatureC\":null,";
        json += "\"humidityPercent\":null,";
        json += "\"mode\":\"LIVE\",";
        json += "\"uptimeSeconds\":" + String(uptimeSec) + ",";
        json += "\"sequence\":" + String(sNum) + ",";
        json += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\"";
        if (isoTime.length() > 0) {
          json += ",\"timestamp\":\"" + isoTime + "\"";
        }
        json += "}";

        int httpCode = http.POST(json);
        if (httpCode == 200 || httpCode == 201) {
          // Telemetry accepted
        } else if (httpCode == 401) {
          Serial.println(F("[NET WARN] Ingest Rejected: Invalid X-Device-Token!"));
        } else if (httpCode > 0) {
          Serial.print(F("[NET WARN] Ingest HTTP Code: "));
          Serial.println(httpCode);
        }

        http.end();
      }
    }

    // Yield Core 0 time to RTOS scheduler
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// Generate ISO-8601 UTC timestamp if NTP is synchronized
String getIsoTimestamp() {
  time_t rawtime;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 10)) {
    return ""; // Empty string allows backend to apply server UTC time
  }
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// ==================================================================================
// 8. LOCAL HTTP DIAGNOSTIC SERVER HANDLERS
// ==================================================================================
void handleGetStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  portENTER_CRITICAL(&stateMux);
  int snapAdc       = currentGasAdc;
  String snapStatus = currentGasStatus;
  bool snapRelay    = relayActive;
  bool snapBuzzer   = buzzerActive;
  unsigned long sNum = seqNumber;
  portEXIT_CRITICAL(&stateMux);

  unsigned long uptimeSec = millis() / 1000;
  String isoTime = getIsoTimestamp();

  String json = "{";
  json += "\"deviceId\":\"" + String(SENTINEL_DEVICE_ID) + "\",";
  json += "\"gasAdc\":" + String(snapAdc) + ",";
  json += "\"gasStatus\":\"" + snapStatus + "\",";
  json += "\"relayState\":" + String(snapRelay ? "true" : "false") + ",";
  json += "\"buzzerState\":" + String(snapBuzzer ? "true" : "false") + ",";
  json += "\"temperatureC\":null,";
  json += "\"humidityPercent\":null,";
  json += "\"mode\":\"LIVE\",";
  json += "\"uptimeSeconds\":" + String(uptimeSec) + ",";
  json += "\"sequence\":" + String(sNum) + ",";
  json += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\"";
  if (isoTime.length() > 0) {
    json += ",\"timestamp\":\"" + isoTime + "\"";
  }
  json += "}";

  server.send(200, "application/json", json);
}

void handleGetHealth() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  unsigned long uptimeSec = millis() / 1000;
  String json = "{";
  json += "\"status\":\"ONLINE\",";
  json += "\"deviceId\":\"" + String(SENTINEL_DEVICE_ID) + "\",";
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
