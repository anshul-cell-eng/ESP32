# SENTINEL REST & Telemetry Stream API Specification

The SENTINEL backend exposes a fully documented, Pydantic-validated REST API and Server-Sent Events (SSE) telemetry broadcaster.

Base URL: `http://localhost:8000`

---

## 1. System Health

### `GET /api/health`
Returns high-level status of the FastAPI daemon, SQLite database connection, and collector loop.

**Response (200 OK):**
```json
{
  "status": "HEALTHY",
  "service": "SENTINEL — Smart LPG Safety Monitoring Platform",
  "version": "1.0.0",
  "database": "CONNECTED",
  "collectorRunning": true,
  "timestamp": "2026-10-28T16:50:00.000Z"
}
```

---

## 2. Current Status & Telemetry

### `GET /api/status`
Returns the instantaneous state of the physical ESP32, current ADC conversion, actuator states, and threshold limits.

**Response (200 OK):**
```json
{
  "isOnline": true,
  "lastResponseTimestamp": "2026-10-28T16:50:00Z",
  "latencyMs": 14.2,
  "consecutiveFailures": 0,
  "deviceData": {
    "deviceId": "HC001",
    "gasAdc": 1150,
    "gasStatus": "SAFE",
    "relayState": false,
    "buzzerState": false,
    "temperatureC": null,
    "humidityPercent": null,
    "mode": "LIVE",
    "uptimeSeconds": 1450,
    "sequence": 451,
    "firmwareVersion": "1.0.0",
    "timestamp": "2026-10-28T16:50:00Z"
  },
  "backendTimestamp": "2026-10-28T16:50:00.120Z",
  "mode": "LIVE",
  "thresholdMismatch": false,
  "safeThreshold": 1500,
  "criticalThreshold": 2000
}
```

---

## 3. Real-Time Telemetry Streaming

### `GET /api/stream`
Server-Sent Events (SSE) endpoint providing low-latency telemetry updates and event alerts directly to web browsers.

**Events Broadcasted:**
- `connect`: Initial greeting on client handshake
- `telemetry`: Emitted on every polling cycle with `SystemStatus` payload
- `event`: Emitted on state transitions (e.g. Warning/Critical alerts, Relay cutoff, Connection state)
- `settings_updated`: Emitted when operational thresholds or configurations are modified

---

## 4. Historical Sensor Data

### `GET /api/readings`
Query parameters:
- `limit` (int, default: 100, max: 1000)
- `from` (ISO 8601 string, optional)
- `to` (ISO 8601 string, optional)
- `source` ("LIVE" | "DEMO", optional)

---

## 5. Event Timeline & Deduplication

### `GET /api/events`
Query parameters:
- `limit` (int, default: 50, max: 500)
- `severity` ("INFO" | "SAFE" | "WARNING" | "CRITICAL" | "ERROR", optional)
- `source` ("LIVE" | "DEMO", optional)

---

## 6. Settings Configuration

### `GET /api/settings`
Returns operational settings.

### `PUT /api/settings`
Updates runtime parameters. Strictly validates `safeThreshold < criticalThreshold`.

**Payload:**
```json
{
  "esp32Ip": "192.168.1.105",
  "deviceId": "HC001",
  "safeThreshold": 1400,
  "criticalThreshold": 2100,
  "mode": "LIVE"
}
```
