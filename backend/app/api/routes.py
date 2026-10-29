import httpx
import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Header, Request, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.schemas import (
    SystemStatusResponse, 
    SensorReading, 
    EventItem, 
    SettingsModel, 
    SettingsUpdate, 
    PingResponse, 
    DiagnosticsResponse, 
    OperatingMode,
    DeviceStatusPayload,
    IngestResponse
)
from app.database import get_readings, get_events, check_db_health, is_postgres
from app.collector import device_collector
from app.sse import sse_manager

router = APIRouter(prefix="/api")
start_time = time.time()

class ScenarioRequest(BaseModel):
    scenario: str # SAFE, WARNING, CRITICAL, RECOVERY, CUSTOM
    customAdc: Optional[int] = None

class PingRequest(BaseModel):
    targetIp: Optional[str] = None

def verify_device_token(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> str:
    """Verify device authentication token from header."""
    token = x_device_token
    if not token and authorization:
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

    if not token or token != settings.SENTINEL_DEVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing device authentication token. Set matching X-Device-Token header."
        )
    return token

@router.get("/health")
async def health_check():
    """Health status of backend service and DB connection."""
    db_ok = check_db_health()
    db_engine = "PostgreSQL" if is_postgres() else "SQLite"

    return {
        "status": "HEALTHY" if db_ok else "DEGRADED",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "database": "CONNECTED" if db_ok else "ERROR",
        "databaseEngine": db_engine,
        "collectorRunning": device_collector.is_running,
        "deviceOnline": device_collector.is_online,
        "uptimeSeconds": round(time.time() - start_time, 2),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.post("/ingest", response_model=IngestResponse)
async def ingest_device_telemetry(
    payload: DeviceStatusPayload,
    request: Request,
    token: str = Depends(verify_device_token)
):
    """
    Authenticated HTTPS Ingestion Endpoint for ESP32.
    Accepts real-time MQ-2 sensor readings and actuator states over public internet.
    """
    client_ip = request.client.host if request.client else "unknown"
    await device_collector.ingest_telemetry(payload, client_ip)

    now_utc = payload.timestamp or datetime.now(timezone.utc).isoformat()
    return IngestResponse(
        status="success",
        message="Telemetry ingested, persisted, and broadcast to clients.",
        deviceId=payload.deviceId,
        gasStatus=payload.gasStatus.value,
        gasAdc=payload.gasAdc,
        timestamp=now_utc,
        acknowledged=True
    )

@router.get("/status", response_model=SystemStatusResponse)
async def get_current_status():
    """Current live state of device and backend."""
    return device_collector.get_system_status()

@router.get("/readings", response_model=List[SensorReading])
async def get_history_readings(
    limit: int = Query(default=100, ge=1, le=1000),
    from_time: Optional[str] = Query(default=None, alias="from"),
    to_time: Optional[str] = Query(default=None, alias="to"),
    source: Optional[str] = Query(default=None)
):
    """Retrieve historical sensor readings."""
    return get_readings(limit=limit, from_time=from_time, to_time=to_time, source=source)

@router.get("/events", response_model=List[EventItem])
async def get_event_timeline(
    limit: int = Query(default=50, ge=1, le=500),
    severity: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None)
):
    """Retrieve deduplicated system events and alert transitions."""
    return get_events(limit=limit, severity=severity, source=source)

@router.get("/device")
async def get_device_info():
    """Information on configured hardware target."""
    return {
        "deviceId": device_collector.device_id,
        "esp32Ip": device_collector.esp32_ip,
        "isOnline": device_collector.is_online,
        "lastSuccessfulResponse": device_collector.last_response_timestamp_str,
        "consecutiveFailures": device_collector.consecutive_failures,
        "latencyMs": device_collector.last_latency_ms,
        "lastKnownPayload": device_collector.last_valid_payload
    }

@router.get("/settings", response_model=SettingsModel)
async def get_app_settings():
    """Retrieve current operational settings."""
    return SettingsModel(
        deviceId=device_collector.device_id,
        esp32Ip=device_collector.esp32_ip,
        pollingIntervalSeconds=device_collector.polling_interval,
        staleTimeoutSeconds=device_collector.stale_timeout,
        safeThreshold=device_collector.safe_threshold,
        criticalThreshold=device_collector.critical_threshold,
        mode=device_collector.mode
    )

@router.put("/settings", response_model=SettingsModel)
async def update_app_settings(updates: SettingsUpdate):
    """Update settings with strict threshold validation (safe < critical)."""
    new_safe = updates.safeThreshold if updates.safeThreshold is not None else device_collector.safe_threshold
    new_crit = updates.criticalThreshold if updates.criticalThreshold is not None else device_collector.critical_threshold

    if new_safe >= new_crit:
        raise HTTPException(
            status_code=400, 
            detail=f"Safe threshold ({new_safe}) must be strictly less than Critical threshold ({new_crit})"
        )

    if updates.deviceId is not None:
        device_collector.device_id = updates.deviceId.strip()
    if updates.esp32Ip is not None:
        device_collector.esp32_ip = updates.esp32Ip.strip()
    if updates.pollingIntervalSeconds is not None:
        device_collector.polling_interval = updates.pollingIntervalSeconds
    if updates.staleTimeoutSeconds is not None:
        device_collector.stale_timeout = updates.staleTimeoutSeconds
    if updates.safeThreshold is not None:
        device_collector.safe_threshold = updates.safeThreshold
    if updates.criticalThreshold is not None:
        device_collector.critical_threshold = updates.criticalThreshold
    if updates.mode is not None:
        device_collector.mode = updates.mode

    # Broadcast updated settings to UI
    current = await get_app_settings()
    await sse_manager.broadcast("settings_updated", current.model_dump())
    return current

@router.get("/stream")
async def stream_telemetry():
    """Server-Sent Events (SSE) stream for real-time telemetry."""
    return StreamingResponse(
        sse_manager.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/diagnostics/ping", response_model=PingResponse)
async def ping_device(req: PingRequest):
    """Safely test connection to ESP32 without altering actuators."""
    ip = req.targetIp or device_collector.esp32_ip
    ip_clean = ip.strip()
    if not ip_clean.startswith("http://") and not ip_clean.startswith("https://"):
        target_url = f"http://{ip_clean}/api/health"
    else:
        target_url = f"{ip_clean.rstrip('/')}/api/health"

    start_t = time.time()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(target_url)
            latency = round((time.time() - start_t) * 1000.0, 2)
            return PingResponse(
                success=(resp.status_code == 200),
                targetIp=ip_clean,
                latencyMs=latency,
                statusCode=resp.status_code,
                message=f"Received HTTP {resp.status_code} in {latency}ms"
            )
    except httpx.TimeoutException:
        return PingResponse(
            success=False,
            targetIp=ip_clean,
            latencyMs=None,
            statusCode=408,
            message="Connection timed out after 3.0s"
        )
    except Exception as e:
        return PingResponse(
            success=False,
            targetIp=ip_clean,
            latencyMs=None,
            statusCode=500,
            message=f"Connection error: {str(e)}"
        )

@router.post("/demo/scenario")
async def trigger_demo_scenario(req: ScenarioRequest):
    """Trigger demonstration scenario for presentation without physical hardware."""
    device_collector.inject_demo_scenario(req.scenario, req.customAdc)
    return {"message": f"Scenario {req.scenario} applied successfully."}

@router.get("/diagnostics", response_model=DiagnosticsResponse)
async def get_diagnostics():
    """Complete diagnostic status."""
    db_ok = check_db_health()
    db_engine = "PostgreSQL" if is_postgres() else "SQLite"
    db_status = f"ONLINE ({db_engine})" if db_ok else "ERROR"

    return DiagnosticsResponse(
        backendStatus="RUNNING",
        databaseStatus=db_status,
        deviceConnection={
            "isOnline": device_collector.is_online,
            "ip": device_collector.esp32_ip,
            "deviceId": device_collector.device_id,
            "consecutiveFailures": device_collector.consecutive_failures,
            "lastLatencyMs": device_collector.last_latency_ms,
            "lastSuccessfulTime": device_collector.last_response_timestamp_str,
            "staleTimeoutSeconds": device_collector.stale_timeout
        },
        activeStreamClients=sse_manager.client_count,
        systemUptimeSeconds=round(time.time() - start_time, 2),
        configuredSettings=await get_app_settings()
    )

@router.post("/diagnostics/discover")
async def discover_esp32_device():
    """Scans local subnets to auto-discover an active ESP32 device."""
    found_ip = await device_collector.auto_discover_esp32()
    if found_ip:
        return {
            "success": True,
            "foundIp": found_ip,
            "message": f"Successfully auto-discovered ESP32 at {found_ip}"
        }
    return {
        "success": False,
        "foundIp": None,
        "message": "No active ESP32 found on local network subnets"
    }
