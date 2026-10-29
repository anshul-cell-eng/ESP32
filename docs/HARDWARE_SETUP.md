# SENTINEL Hardware Setup & Circuit Integration Guide

## 1. Component Checklist

| Component | Specification | Quantity | Primary Function |
| :--- | :--- | :--- | :--- |
| **ESP32 DevKit** | 30-pin or 38-pin (NodeMCU ESP32) | 1 | Master IoT Controller & HTTP Server |
| **MQ-2 Gas Sensor** | Combustible gas & smoke sensor | 1 | Analog detection of LPG, CH4, CO, smoke |
| **Relay Module** | 5V / 3.3V Optocoupler Relay | 1 | Gas cutoff solenoid actuator simulation |
| **Active Buzzer** | 3.3V - 5V Continuous tone buzzer | 1 | Acoustic alarm transducer |
| **RGB LED** | Common Cathode (4-pin) | 1 | Visual optical status beacon |
| **Resistors** | 220Ω (1/4 W) | 3 | Current limiting for RGB LED channels |
| **OLED Display (Optional)** | 0.96" SSD1306 128x64 I2C | 1 | Local debugging screen |
| **Breadboard & Wires** | Full-size breadboard & Jumper wires | 1 set | Solderless prototyping |

---

## 2. Wiring & Pin Connection Table

```
                         ESP32 DevKit V1
                       ┌─────────────────┐
                 3V3 ──┤ 3V3         GND ├── GND
                  EN ──┤ EN         GPIO23├── [NC]
         [NC] GPIO36 ──┤ VP         GPIO22├── OLED SCL (Optional)
  MQ-2 AOUT ── GPIO34 ──┤ D34        GPIO1 ├── [TX]
         [NC] GPIO35 ──┤ D35        GPIO3 ├── [RX]
         [NC] GPIO32 ──┤ D32        GPIO21├── OLED SDA (Optional)
         [NC] GPIO33 ──┤ D33        GPIO19├── [NC]
  RGB RED ── GPIO25 ──┤ D25        GPIO18├── [NC]
RGB GREEN ── GPIO26 ──┤ D26         GPIO5├── [NC]
 RGB BLUE ── GPIO27 ──┤ D27        GPIO17├── [NC]
  BUZZER ─── GPIO14 ──┤ D14        GPIO16├── [NC]
   RELAY ─── GPIO13 ──┤ D13         GPIO4├── [NC]
                       └─────────────────┘
```

### Detailed Connections

1. **MQ-2 Gas Sensor Module**:
   - `VCC` -> Connect to ESP32 `VIN` (5V recommended for MQ-2 heater coil)
   - `GND` -> Connect to ESP32 `GND`
   - `AOUT` (Analog Out) -> Connect to ESP32 `GPIO 34` (ADC1_CH6)
   - *Note: Leave DOUT disconnected; we use the 12-bit ADC.*

2. **Relay Module (Emergency Solenoid Cutoff)**:
   - `VCC` -> Connect to `VIN` (5V) or `3V3` depending on module rating
   - `GND` -> Connect to ESP32 `GND`
   - `IN` -> Connect to ESP32 `GPIO 13`

3. **Active Buzzer**:
   - `Positive (+)` -> Connect to ESP32 `GPIO 14`
   - `Negative (-)` -> Connect to ESP32 `GND`

4. **RGB LED (Common Cathode)**:
   - `Red Pin` -> 220Ω Resistor -> `GPIO 25`
   - `Cathode (Longest Pin)` -> ESP32 `GND`
   - `Green Pin` -> 220Ω Resistor -> `GPIO 26`
   - `Blue Pin` -> 220Ω Resistor -> `GPIO 27`

5. **Optional SSD1306 OLED (I2C)**:
   - `VCC` -> `3V3`
   - `GND` -> `GND`
   - `SDA` -> `GPIO 21`
   - `SCL` -> `GPIO 22`

---

## 3. MQ-2 Sensor Burn-in & Warm-up

> [!IMPORTANT]
> The MQ-2 sensor uses an internal SnO2 heating wire. Upon first unboxing, it requires **12 to 24 hours of preheating (burn-in)** to stabilize its baseline resistance in clean air.
> During normal demonstration, allow **1 to 2 minutes** of initial warm-up after powering on before taking calibrated readings. The sensor will feel noticeably warm to the touch—this is completely normal.
