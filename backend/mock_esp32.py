"""
SENTINEL Mock ESP32 Device Server
Simulates an actual ESP32 running the sentinel_esp32.ino firmware.
Listens on http://127.0.0.1:8080 by default.
"""

import time
import uvicorn
from datetime import datetime, timezone
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="SENTINEL Mock ESP32 Hardware")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulated Hardware State
state = {
    "deviceId": "HC001",
    "gasAdc": 420,
    "relayState": False,
    "buzzerState": False,
    "temperatureC": 28.5,
    "humidityPercent": 52.0,
    "sequence": 1,
    "startTime": time.time(),
    "firmwareVersion": "1.0.0-PROD",
    "autoDrift": True
}

def compute_hardware_safety_logic():
    # Mirrored failsafe from sentinel_esp32.ino
    adc = state["gasAdc"]
    if adc > 2000:
        status = "CRITICAL"
        state["relayState"] = True
        state["buzzerState"] = True
    elif adc >= 1500:
        status = "WARNING"
        state["relayState"] = False
        state["buzzerState"] = True
    else:
        status = "SAFE"
        state["relayState"] = False
        state["buzzerState"] = False
    return status

@app.get("/api/health")
async def health():
    return {
        "status": "ONLINE",
        "deviceId": state["deviceId"],
        "firmware": state["firmwareVersion"],
        "uptimeSeconds": int(time.time() - state["startTime"]),
        "wifiRssi": -58
    }

@app.get("/api/status")
async def status():
    state["sequence"] += 1
    
    # Slight analog jitter
    if state["autoDrift"]:
        import random
        jitter = random.randint(-4, 4)
        state["gasAdc"] = max(100, min(4000, state["gasAdc"] + jitter))
        
    gas_status = compute_hardware_safety_logic()
    now_utc = datetime.now(timezone.utc).isoformat()
    
    return {
        "deviceId": state["deviceId"],
        "gasAdc": state["gasAdc"],
        "gasStatus": gas_status,
        "relayState": state["relayState"],
        "buzzerState": state["buzzerState"],
        "temperatureC": state["temperatureC"],
        "humidityPercent": state["humidityPercent"],
        "mode": "LIVE",
        "uptimeSeconds": int(time.time() - state["startTime"]),
        "sequence": state["sequence"],
        "firmwareVersion": state["firmwareVersion"],
        "timestamp": now_utc
    }

class StateOverride(BaseModel):
    gasAdc: Optional[int] = None
    autoDrift: Optional[bool] = None
    relayState: Optional[bool] = None
    buzzerState: Optional[bool] = None

@app.post("/api/override")
async def override_state(update: StateOverride):
    """Allows test suites to programmatically alter simulated hardware readings."""
    if update.gasAdc is not None:
        state["gasAdc"] = update.gasAdc
    if update.autoDrift is not None:
        state["autoDrift"] = update.autoDrift
    if update.relayState is not None:
        state["relayState"] = update.relayState
    if update.buzzerState is not None:
        state["buzzerState"] = update.buzzerState
    compute_hardware_safety_logic()
    return {"message": "Hardware state updated", "currentState": state}

if __name__ == "__main__":
    print("[MOCK ESP32] Running on http://127.0.0.1:8080")
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="warning")
