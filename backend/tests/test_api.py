import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.config import settings

@pytest.fixture(scope="session", autouse=True)
def init_db_fixture():
    init_db()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["HEALTHY", "DEGRADED"]
    assert "SENTINEL" in data["service"]
    assert data["database"] == "CONNECTED"

def test_status_endpoint(client):
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "isOnline" in data
    assert "mode" in data
    assert "safeThreshold" in data
    assert "criticalThreshold" in data

def test_ingest_unauthorized(client):
    payload = {
        "deviceId": "HC001",
        "gasAdc": 1200,
        "gasStatus": "SAFE",
        "relayState": False,
        "buzzerState": False
    }
    # No token provided
    res = client.post("/api/ingest", json=payload)
    assert res.status_code == 401

    # Wrong token provided
    res_bad = client.post("/api/ingest", json=payload, headers={"X-Device-Token": "invalid_wrong_token"})
    assert res_bad.status_code == 401

def test_ingest_valid_authenticated(client):
    payload = {
        "deviceId": "HC001",
        "gasAdc": 1350,
        "gasStatus": "SAFE",
        "relayState": False,
        "buzzerState": False,
        "temperatureC": 26.8,
        "humidityPercent": 50.5,
        "firmwareVersion": "1.1.0"
    }
    headers = {"X-Device-Token": settings.SENTINEL_DEVICE_TOKEN}
    res = client.post("/api/ingest", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["deviceId"] == "HC001"
    assert data["gasAdc"] == 1350

    # Verify device status reflects ingestion
    status_res = client.get("/api/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["isOnline"] is True
    assert status_data["deviceData"]["gasAdc"] == 1350

def test_ingest_payload_validation_errors(client):
    headers = {"X-Device-Token": settings.SENTINEL_DEVICE_TOKEN}

    # Invalid ADC > 4095
    bad_adc = {
        "deviceId": "HC001",
        "gasAdc": 9999,
        "gasStatus": "SAFE",
        "relayState": False,
        "buzzerState": False
    }
    res = client.post("/api/ingest", json=bad_adc, headers=headers)
    assert res.status_code == 422

    # Negative ADC
    neg_adc = {
        "deviceId": "HC001",
        "gasAdc": -50,
        "gasStatus": "SAFE",
        "relayState": False,
        "buzzerState": False
    }
    res = client.post("/api/ingest", json=neg_adc, headers=headers)
    assert res.status_code == 422

def test_history_readings(client):
    res = client.get("/api/readings?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    latest = data[-1]
    assert "gasAdc" in latest
    assert "gasStatus" in latest

def test_settings_validation(client):
    # Invalid thresholds: safe >= critical
    bad_payload = {
        "safeThreshold": 2200,
        "criticalThreshold": 1500
    }
    res = client.put("/api/settings", json=bad_payload)
    assert res.status_code == 400
    assert "must be strictly less" in res.json()["detail"]

    # Valid thresholds
    good_payload = {
        "safeThreshold": 1400,
        "criticalThreshold": 2100
    }
    res_ok = client.put("/api/settings", json=good_payload)
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["safeThreshold"] == 1400
    assert data["criticalThreshold"] == 2100

def test_demo_scenario_injection(client):
    res = client.post("/api/demo/scenario", json={"scenario": "WARNING"})
    assert res.status_code == 200
