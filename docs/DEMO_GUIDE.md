# SENTINEL College Presentation & Demonstration Guide

This guide describes how to deliver a flawless, high-impact college project demonstration of the **SENTINEL — Smart LPG Safety Monitoring Platform**.

---

## 1. Presentation Structure (5 - 8 Minute Flow)

### Step 1: The Problem & Value Proposition (1 min)
- **Problem**: Undetected Liquefied Petroleum Gas (LPG) leaks cause catastrophic fires, asphyxiation, and explosions in commercial kitchens and residential homes.
- **Solution**: SENTINEL delivers early warning multi-tier defense: autonomous embedded edge protection (100ms hardware failsafe) coupled with a cinematic 3D command center providing live telemetry, historical analytics, and instant valve cutoff.

### Step 2: The Cinematic Experience (1 min)
- Launch the web application on a large monitor or projector.
- Let the **Cinematic 3D Intro** assemble: Starry matrix -> Scanning ring -> Hexagonal shield hologram -> SENTINEL typography reveal.
- Explain the central design philosophy: Industrial elegance, information-rich engineering telemetry, zero generic dashboard templates.

### Step 3: Central 3D Safety Shield & Real-time Telemetry (2 mins)
- Point out the **Central 3D Holographic Shield**:
  - Translucent beveled hexagonal glass shield.
  - Three flowing gas waves & luminous detection point.
  - Concentric radar scanning rings and floating atmospheric particles.
  - Interactive mouse tilt on desktop.
- Explain the physical sensor architecture:
  - MQ-2 gas sensor on ESP32 GPIO 34 (12-bit analog input, 0-4095 counts).
  - Relay module (GPIO 13) for solenoid valve cutoff.
  - Active buzzer (GPIO 14) and 3-color RGB LED.

### Step 4: Live Gas Leak Simulation (2 mins)
Using the built-in **Demo Control Center** or a small cigarette lighter gas release near the real sensor:
1. **Trigger Normal Ambient** (~420 ADC): Shield is cyan/green, scan is calm, relay is PASS.
2. **Trigger Warning Phase** (~1680 ADC): Shield turns amber-gold, scanning speeds up, buzzer warning beeps.
3. **Trigger Critical Leakage** (~2650 ADC):
   - Shield pulses intense ruby crimson.
   - Emergency Solenoid Cutoff trips (Relay ON).
   - In-app toast alerts pop up and synthetic alarm sounds.
   - Real-time Recharts curve crosses the threshold boundary.
4. **Trigger Exhaust Ventilation Recovery** (~850 ADC):
   - Status recovers to SAFE, relay resets, system stabilizes.

### Step 5: Hardware & Mobile Access (1 min)
- Show the web app running simultaneously on your smartphone connected via local Wi-Fi.
- Review the **Diagnostics View**: 0 packet loss, sub-20ms latency, persistent SQLite storage, deduplicated event bus.
