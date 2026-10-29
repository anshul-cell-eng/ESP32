import os
os.environ["TESTING"] = "1"
import pytest
from datetime import datetime, timezone
from app.schemas import DeviceStatusPayload, GasStatus, OperatingMode
from app.collector import DeviceCollector
from app.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

def test_device_payload_validation():
    now_utc = datetime.now(timezone.utc).isoformat()
    raw = {
        "deviceId": "HC001",
        "gasAdc": 1250,
        "gasStatus": "SAFE",
        "relayState": False,
        "buzzerState": False,
        "temperatureC": 26.5,
        "humidityPercent": 48.0,
        "mode": "LIVE",
        "uptimeSeconds": 300,
        "sequence": 12,
        "firmwareVersion": "1.1.0",
        "timestamp": now_utc
    }
    payload = DeviceStatusPayload(**raw)
    assert payload.deviceId == "HC001"
    assert payload.gasAdc == 1250
    assert payload.gasStatus == GasStatus.SAFE
    assert payload.relayState is False

@pytest.mark.asyncio
async def test_state_transitions_and_deduplication():
    collector = DeviceCollector()
    now_utc = datetime.now(timezone.utc).isoformat()
    
    # 1. First Reading SAFE
    p1 = DeviceStatusPayload(
        deviceId="HC001",
        gasAdc=800,
        gasStatus=GasStatus.SAFE,
        relayState=False,
        buzzerState=False,
        timestamp=now_utc
    )
    await collector._process_state_transitions(p1, is_live=True, latency=10.0)
    assert collector._prev_status == GasStatus.SAFE

    # 2. Transition to CRITICAL
    p2 = DeviceStatusPayload(
        deviceId="HC001",
        gasAdc=2500,
        gasStatus=GasStatus.CRITICAL,
        relayState=True,
        buzzerState=True,
        timestamp=now_utc
    )
    await collector._process_state_transitions(p2, is_live=True, latency=10.0)
    assert collector._prev_status == GasStatus.CRITICAL
    assert collector._prev_relay is True
    assert collector._prev_buzzer is True

    # 3. Subsequent poll also CRITICAL (deduplicated)
    p3 = DeviceStatusPayload(
        deviceId="HC001",
        gasAdc=2520,
        gasStatus=GasStatus.CRITICAL,
        relayState=True,
        buzzerState=True,
        timestamp=now_utc
    )
    await collector._process_state_transitions(p3, is_live=True, latency=10.0)
    assert collector._prev_status == GasStatus.CRITICAL

    # 4. Recovery to SAFE
    p4 = DeviceStatusPayload(
        deviceId="HC001",
        gasAdc=750,
        gasStatus=GasStatus.SAFE,
        relayState=False,
        buzzerState=False,
        timestamp=now_utc
    )
    await collector._process_state_transitions(p4, is_live=True, latency=10.0)
    assert collector._prev_status == GasStatus.SAFE
    assert collector._prev_relay is False

@pytest.mark.asyncio
async def test_ingest_telemetry_flow():
    collector = DeviceCollector()
    now_utc = datetime.now(timezone.utc).isoformat()
    payload = DeviceStatusPayload(
        deviceId="HC001",
        gasAdc=1850,
        gasStatus=GasStatus.WARNING,
        relayState=False,
        buzzerState=True,
        timestamp=now_utc
    )
    await collector.ingest_telemetry(payload, client_ip="192.168.1.50")
    assert collector.is_online is True
    assert collector.last_valid_payload is not None
    assert collector.last_valid_payload.gasAdc == 1850
    assert collector.last_valid_payload.gasStatus == GasStatus.WARNING
