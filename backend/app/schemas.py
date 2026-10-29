from enum import Enum
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone

class GasStatus(str, Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class Severity(str, Enum):
    INFO = "INFO"
    SAFE = "SAFE"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    ERROR = "ERROR"

class OperatingMode(str, Enum):
    LIVE = "LIVE"
    DEMO = "DEMO"

class DeviceStatusPayload(BaseModel):
    deviceId: str = Field(..., min_length=1, max_length=64, description="Unique ESP32 device identifier, e.g. HC001")
    gasAdc: int = Field(..., ge=0, le=4095, description="12-bit ADC reading from MQ-2 sensor (0-4095)")
    gasStatus: GasStatus = Field(..., description="Firmware-determined status")
    relayState: bool = Field(..., description="Current digital relay output state")
    buzzerState: bool = Field(..., description="Current active buzzer output state")
    temperatureC: Optional[float] = Field(None, description="Optional temperature in Celsius if sensor connected")
    humidityPercent: Optional[float] = Field(None, description="Optional relative humidity percentage")
    mode: OperatingMode = Field(default=OperatingMode.LIVE, description="Device operating mode")
    uptimeSeconds: Optional[int] = Field(None, ge=0, description="ESP32 monotonic uptime in seconds")
    sequence: Optional[int] = Field(None, ge=0, description="Monotonic reading sequence number")
    firmwareVersion: Optional[str] = Field("1.1.0", description="Installed firmware version")
    timestamp: Optional[str] = Field(None, description="ISO 8601 UTC timestamp reported by device or server")

    @field_validator("timestamp", mode="before")
    @classmethod
    def set_default_timestamp(cls, v):
        if not v or str(v).isdigit():
            return datetime.now(timezone.utc).isoformat()
        return str(v)

class IngestResponse(BaseModel):
    status: str = "success"
    message: str
    deviceId: str
    gasStatus: str
    gasAdc: int
    timestamp: str
    acknowledged: bool = True

class SystemStatusResponse(BaseModel):
    isOnline: bool
    lastResponseTimestamp: Optional[str] = None
    latencyMs: Optional[float] = None
    consecutiveFailures: int = 0
    deviceData: Optional[DeviceStatusPayload] = None
    backendTimestamp: str
    mode: OperatingMode
    thresholdMismatch: bool = False
    safeThreshold: int
    criticalThreshold: int

class SensorReading(BaseModel):
    id: Optional[int] = None
    timestamp: str
    gasAdc: int
    gasStatus: str
    relayState: bool
    buzzerState: bool
    source: str = "LIVE"
    latencyMs: Optional[float] = None

class EventItem(BaseModel):
    id: str
    timestamp: str
    eventType: str
    severity: Severity
    description: str
    source: str = "LIVE"
    gasAdc: Optional[int] = None

class SettingsModel(BaseModel):
    deviceId: str
    esp32Ip: str
    pollingIntervalSeconds: float
    staleTimeoutSeconds: float
    safeThreshold: int
    criticalThreshold: int
    mode: OperatingMode

class SettingsUpdate(BaseModel):
    deviceId: Optional[str] = None
    esp32Ip: Optional[str] = None
    pollingIntervalSeconds: Optional[float] = None
    staleTimeoutSeconds: Optional[float] = None
    safeThreshold: Optional[int] = None
    criticalThreshold: Optional[int] = None
    mode: Optional[OperatingMode] = None

    @field_validator("pollingIntervalSeconds")
    @classmethod
    def validate_polling(cls, v):
        if v is not None and (v < 0.2 or v > 60.0):
            raise ValueError("Polling interval must be between 0.2 and 60.0 seconds")
        return v

class PingResponse(BaseModel):
    success: bool
    targetIp: str
    latencyMs: Optional[float] = None
    statusCode: Optional[int] = None
    message: str

class DiagnosticsResponse(BaseModel):
    backendStatus: str
    databaseStatus: str
    deviceConnection: Dict[str, Any]
    activeStreamClients: int
    systemUptimeSeconds: float
    configuredSettings: SettingsModel
