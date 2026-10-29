# SENTINEL — Smart LPG Safety Monitoring Platform

> **Tagline:** *Detect Early. Protect Every Life.*  
> **Hardware:** ESP32 Microcontroller, MQ-2 Combustible Gas Sensor, Relay Solenoid Module, Active Buzzer, RGB LED, I2C OLED Display.

![SENTINEL Architecture](https://img.shields.io/badge/Architecture-IoT%20%7C%20FastAPI%20%7C%20React%20%7C%20PostgreSQL-teal)
![Deployment](https://img.shields.io/badge/Render-Blueprint%20Deployable-green)
![Status](https://img.shields.io/badge/Status-Cloud%20%26%20Hardware%20Ready-brightgreen)

SENTINEL is an industrial-grade, cinematic LPG safety monitoring platform that bridges real embedded hardware telemetry with an ultra-responsive, 3D command center and automated gas isolation.

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                              EDGE HARDWARE                              |
|                                                                         |
|  [MQ-2 Gas Sensor] ---> [ESP32 (GPIO 34 ADC)]                           |
|                               |                                         |
|                               v  (<100ms Failsafe Loop)                 |
|               [Relay Cutoff (GPIO 13)] + [Buzzer (GPIO 14)]              |
|                               |                                         |
+-------------------------------|-----------------------------------------+
                                | Authenticated HTTPS POST /api/ingest
                                | (Bearer / X-Device-Token)
                                v
+-------------------------------------------------------------------------+
|                           RENDER CLOUD BACKEND                          |
|                                                                         |
|       FastAPI Web Service (0.0.0.0:$PORT)                              |
|       - Ingestion & Validation (/api/ingest)                            |
|       - Server-Sent Events Hub (/api/stream)                            |
|       - Health Check (/api/health)                                      |
|       - Historical Query Engine (/api/readings, /api/events)            |
|                               |                                         |
|          +--------------------+--------------------+                    |
|          v                                         v                    |
|  [Render PostgreSQL]                    [Render Static Frontend]        |
|  Persistent time-series                 Vite + React + Three.js         |
|  readings & event logs                  Editorial Safety Dashboard      |
+-------------------------------------------------------------------------+
```

---

## Render Cloud Deployment Guide (Step-by-Step)

This repository includes a multi-service `render.yaml` Blueprint that automatically provisions:
1. **Frontend Static Site** (`sentinel-frontend`)
2. **FastAPI Backend Web Service** (`sentinel-backend`)
3. **Managed PostgreSQL Database** (`sentinel-db`)

### Step 1: Push Repository to GitHub
Ensure all files are committed and pushed to your GitHub repository:
```bash
git remote add origin https://github.com/anshul-cell-eng/ESP32.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render via Blueprint
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation and select **Blueprint**.
3. Connect your GitHub account and select your repository: **`anshul-cell-eng/ESP32`**.
4. Render will automatically read `render.yaml` and display the three services to create:
   - `sentinel-db` (PostgreSQL)
   - `sentinel-backend` (Web Service)
   - `sentinel-frontend` (Static Site)
5. Click **Apply**. Render will automatically build the frontend, launch the Python backend, and link the database connection string.

### Step 3: Configure ESP32 Firmware
1. Open `firmware/sentinel_esp32/sentinel_esp32.ino` in Arduino IDE or PlatformIO.
2. Update Wi-Fi credentials:
   ```cpp
   const char* WIFI_SSID     = "Your-WiFi-Name";
   const char* WIFI_PASSWORD = "Your-WiFi-Password";
   ```
3. Copy your deployed Render backend URL from the Render dashboard (e.g., `https://sentinel-backend.onrender.com`):
   ```cpp
   const char* CLOUD_INGEST_URL = "https://sentinel-backend.onrender.com/api/ingest";
   ```
4. Copy the generated `SENTINEL_DEVICE_TOKEN` from your backend environment variables on Render (or set your own):
   ```cpp
   const char* DEVICE_AUTH_TOKEN = "your-render-device-token";
   ```
5. Flash the firmware to your ESP32. As soon as it boots and connects to Wi-Fi, telemetry readings will appear live on your deployed website!

---

## Environment Variables Reference

### Backend (`sentinel-backend`)

| Variable | Description | Default / Source |
| :--- | :--- | :--- |
| `PORT` | HTTP port assigned by Render | Automatically set by Render (`10000`) |
| `DATABASE_URL` | PostgreSQL connection string | Linked from `sentinel-db` |
| `SENTINEL_DEVICE_TOKEN` | Secret device auth token | Auto-generated or custom |
| `FRONTEND_URL` | Deployed frontend origin for CORS | Linked from `sentinel-frontend` |
| `MODE` | Operating mode (`LIVE` or `DEMO`) | `LIVE` |

### Frontend (`sentinel-frontend`)

| Variable | Description | Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Public URL of deployed backend service | `https://sentinel-backend.onrender.com` |

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service & DB health check | None |
| `POST` | `/api/ingest` | Authenticated ESP32 telemetry push | `X-Device-Token` |
| `GET` | `/api/status` | Current device & system state | None |
| `GET` | `/api/stream` | Server-Sent Events (SSE) telemetry feed | None |
| `GET` | `/api/readings`| Filterable sensor historical records | None |
| `GET` | `/api/events` | Deduplicated alert & cutoff events | None |
| `PUT` | `/api/settings`| Threshold & polling settings update | None |
| `POST`| `/api/demo/scenario` | Presentation scenario simulator | None |

---

## Local Development Quickstart

### Run Backend Locally
```powershell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\python.exe backend\run.py
```
Backend starts on `http://localhost:8000`.

### Run Frontend Locally
```powershell
cd frontend
npm run dev
```
Frontend starts on `http://localhost:5173`.
