import os
import asyncio
import httpx
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.config import settings
from app.schemas import (
    DeviceStatusPayload, 
    SystemStatusResponse, 
    GasStatus, 
    Severity, 
    OperatingMode
)
from app.database import insert_reading, insert_event
from app.sse import sse_manager

logger = logging.getLogger("sentinel.collector")

class DeviceCollector:
    def __init__(self):
        self.is_running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._serial_task: Optional[asyncio.Task] = None
        
        # State tracking
        self.is_online: bool = False
        self.consecutive_failures: int = 0
        self.last_successful_response_time: Optional[float] = None
        self.last_response_timestamp_str: Optional[str] = None
        self.last_latency_ms: Optional[float] = None
        self.last_valid_payload: Optional[DeviceStatusPayload] = None
        self._last_ingest_time: float = 0.0
        self._poll_backoff: float = 1.0
        self._last_poll_attempt: float = 0.0
        
        # Transition detection registers
        self._prev_status: Optional[GasStatus] = None
        self._prev_relay: Optional[bool] = None
        self._prev_buzzer: Optional[bool] = None
        self._prev_online: Optional[bool] = None
        
        # Dynamic configuration overrides
        self.device_id: str = settings.DEVICE_ID
        self.esp32_ip: str = settings.ESP32_IP
        self.polling_interval: float = settings.POLLING_INTERVAL_SECONDS
        self.stale_timeout: float = settings.STALE_TIMEOUT_SECONDS
        self.safe_threshold: int = settings.SAFE_THRESHOLD
        self.critical_threshold: int = settings.CRITICAL_THRESHOLD
        self.mode: OperatingMode = OperatingMode(settings.MODE)
        
        # Simulator state for DEMO mode
        self._demo_adc: int = 420
        self._demo_relay: bool = False
        self._demo_buzzer: bool = False
        self._demo_trend: int = 5

    def get_system_status(self) -> SystemStatusResponse:
        now_utc = datetime.now(timezone.utc).isoformat()
        
        # Check staleness if online
        effective_online = self.is_online
        if self.mode == OperatingMode.LIVE and effective_online and self.last_successful_response_time:
            if time.time() - self.last_successful_response_time > self.stale_timeout:
                effective_online = False
                
        # Threshold mismatch detection
        threshold_mismatch = False
        if self.last_valid_payload:
            adc = self.last_valid_payload.gasAdc
            reported = self.last_valid_payload.gasStatus
            if reported == GasStatus.SAFE and adc >= self.critical_threshold:
                threshold_mismatch = True
            elif reported == GasStatus.CRITICAL and adc < self.safe_threshold:
                threshold_mismatch = True
                
        return SystemStatusResponse(
            isOnline=effective_online if self.mode == OperatingMode.LIVE else True,
            lastResponseTimestamp=self.last_response_timestamp_str,
            latencyMs=self.last_latency_ms,
            consecutiveFailures=self.consecutive_failures,
            deviceData=self.last_valid_payload,
            backendTimestamp=now_utc,
            mode=self.mode,
            thresholdMismatch=threshold_mismatch,
            safeThreshold=self.safe_threshold,
            criticalThreshold=self.critical_threshold
        )

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._poll_loop())
        self._serial_task = asyncio.create_task(self._serial_listener_loop())
        logger.info("DeviceCollector service started with dual HTTP/Serial listeners.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
        if self._serial_task:
            self._serial_task.cancel()
        try:
            if self._task:
                await self._task
            if self._serial_task:
                await self._serial_task
        except asyncio.CancelledError:
            pass
        logger.info("DeviceCollector service stopped.")

    async def ingest_telemetry(self, payload: DeviceStatusPayload, client_ip: str) -> None:
        """Process incoming authenticated telemetry push from ESP32."""
        now = time.time()
        
        # Rate limit protection (drops pushes faster than configured throttle)
        if (now - self._last_ingest_time) < (settings.INGEST_MIN_INTERVAL_MS / 1000.0):
            return
        self._last_ingest_time = now

        now_utc = payload.timestamp or datetime.now(timezone.utc).isoformat()
        self.consecutive_failures = 0
        self.is_online = True
        self._poll_backoff = 1.0
        self.last_successful_response_time = now
        self.last_response_timestamp_str = now_utc
        self.last_latency_ms = 18.5  # Typical HTTPS push acknowledgment latency
        self.last_valid_payload = payload
        self.device_id = payload.deviceId

        logger.info(
            f"ESP32 HTTPS Ingest: Device={payload.deviceId}, ADC={payload.gasAdc}, "
            f"Status={payload.gasStatus}, Relay={payload.relayState}, Client={client_ip}"
        )

        # 1. Record reading in database
        try:
            insert_reading(
                timestamp=now_utc,
                gas_adc=payload.gasAdc,
                gas_status=payload.gasStatus.value,
                relay_state=payload.relayState,
                buzzer_state=payload.buzzerState,
                source="LIVE",
                latency_ms=self.last_latency_ms
            )
        except Exception as e:
            logger.error(f"Failed to record reading to database: {e}")

        # 2. Process state transitions and deduplicated events
        await self._process_state_transitions(payload, is_live=True, latency=self.last_latency_ms)

        # 3. Broadcast live telemetry packet via SSE to all web browsers
        if self.mode == OperatingMode.LIVE:
            status_update = self.get_system_status()
            await sse_manager.broadcast("telemetry", status_update.model_dump())

    async def _poll_loop(self):
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            while self.is_running:
                start_cycle = time.time()
                try:
                    if self.mode == OperatingMode.LIVE:
                        # Check staleness of device connection
                        now = time.time()
                        if self.is_online and self.last_successful_response_time:
                            if now - self.last_successful_response_time > self.stale_timeout:
                                self.is_online = False
                                if self._prev_online is True:
                                    logger.warning("ESP32 telemetry stream timed out; device marked OFFLINE.")
                                    await self._record_connection_event(False, f"ESP32 {self.device_id} disconnected (telemetry timeout)")
                                    self._prev_online = False
                                    status_resp = self.get_system_status()
                                    await sse_manager.broadcast("telemetry", status_resp.model_dump())

                        # Only perform active HTTP polling if recent push has not arrived
                        if not self.last_successful_response_time or (now - self.last_successful_response_time > 3.0):
                            if (now - self._last_poll_attempt) >= self._poll_backoff:
                                self._last_poll_attempt = now
                                success = await self._poll_esp32_device(client)
                                if success:
                                    self._poll_backoff = 1.0
                                else:
                                    # Bounded exponential backoff: 2s -> 3s -> max 10s
                                    self._poll_backoff = min(10.0, max(2.0, self._poll_backoff * 1.5))
                    else:
                        await self._run_demo_tick()
                except Exception as e:
                    logger.error(f"Unexpected error in collector cycle: {e}", exc_info=True)

                elapsed = time.time() - start_cycle
                sleep_time = max(0.1, self.polling_interval - elapsed)
                await asyncio.sleep(sleep_time)

    async def _poll_esp32_device(self, client: httpx.AsyncClient) -> bool:
        ip = self.esp32_ip.strip()
        # Skip polling non-routable placeholder or default IP in cloud environment without errors
        if not ip or ip in ["192.168.1.100", "0.0.0.0", "127.0.0.1"] and os.getenv("RENDER"):
            return False

        if not ip.startswith("http://") and not ip.startswith("https://"):
            url = f"http://{ip}/api/status"
        else:
            url = f"{ip.rstrip('/')}/api/status"

        req_start = time.time()
        try:
            resp = await client.get(url, timeout=3.0)
            latency = round((time.time() - req_start) * 1000.0, 2)
            
            if resp.status_code == 200:
                payload_data = resp.json()
                now_utc = datetime.now(timezone.utc).isoformat()
                ts_val = payload_data.get("timestamp")
                if not ts_val or "T" not in str(ts_val):
                    payload_data["timestamp"] = now_utc
                    
                if "gasStatus" in payload_data:
                    payload_data["gasStatus"] = str(payload_data["gasStatus"]).strip().upper()

                payload = DeviceStatusPayload(**payload_data)
                
                self.consecutive_failures = 0
                self.is_online = True
                self.last_successful_response_time = time.time()
                self.last_response_timestamp_str = payload.timestamp
                self.last_latency_ms = latency
                self.last_valid_payload = payload
                
                insert_reading(
                    timestamp=payload.timestamp,
                    gas_adc=payload.gasAdc,
                    gas_status=payload.gasStatus.value,
                    relay_state=payload.relayState,
                    buzzer_state=payload.buzzerState,
                    source="LIVE",
                    latency_ms=latency
                )

                await self._process_state_transitions(payload, is_live=True, latency=latency)

                if self.mode == OperatingMode.LIVE:
                    status_update = self.get_system_status()
                    await sse_manager.broadcast("telemetry", status_update.model_dump())
                return True
            else:
                self._handle_failure(f"HTTP {resp.status_code}")
                return False
        except httpx.TimeoutException:
            self._handle_failure("Connection timed out (3s)")
            return False
        except httpx.ConnectError:
            self._handle_failure("Connection refused / unreachable host")
            return False
        except Exception as e:
            self._handle_failure(str(e))
            return False

    def _handle_failure(self, reason: str):
        self.consecutive_failures += 1
        if self.consecutive_failures % 30 == 1:
            logger.warning(f"ESP32 Poll Notice (#{self.consecutive_failures}) [{self.esp32_ip}]: {reason}")
        
        now = time.time()
        if self.last_successful_response_time:
            if now - self.last_successful_response_time > self.stale_timeout:
                self.is_online = False
                if self._prev_online is True:
                    asyncio.create_task(
                        self._record_connection_event(False, f"ESP32 {self.device_id} disconnected ({reason})")
                    )
                    self._prev_online = False
        else:
            self.is_online = False

    async def _process_state_transitions(self, payload: DeviceStatusPayload, is_live: bool, latency: Optional[float]):
        src = "LIVE" if is_live else "DEMO"
        
        # 1. Online Transition
        if self._prev_online is False or self._prev_online is None:
            await self._record_connection_event(True, f"ESP32 {payload.deviceId} online ({payload.firmwareVersion})")
        self._prev_online = True

        # 2. Gas Status Transitions
        curr_status = payload.gasStatus
        if self._prev_status != curr_status:
            if curr_status == GasStatus.CRITICAL:
                await self._record_event(
                    event_type="CRITICAL_GAS_ALERT",
                    severity=Severity.CRITICAL,
                    description=f"CRITICAL GAS ALERT: Sensor reading reached {payload.gasAdc} ADC. Emergency cutoff energized!",
                    source=src,
                    gas_adc=payload.gasAdc
                )
            elif curr_status == GasStatus.WARNING:
                await self._record_event(
                    event_type="ELEVATED_GAS_WARNING",
                    severity=Severity.WARNING,
                    description=f"Elevated gas levels detected ({payload.gasAdc} ADC). Caution advised.",
                    source=src,
                    gas_adc=payload.gasAdc
                )
            elif curr_status == GasStatus.SAFE and self._prev_status in [GasStatus.WARNING, GasStatus.CRITICAL]:
                await self._record_event(
                    event_type="GAS_RECOVERY_SAFE",
                    severity=Severity.SAFE,
                    description=f"Gas levels normalized ({payload.gasAdc} ADC). System status: SAFE.",
                    source=src,
                    gas_adc=payload.gasAdc
                )
            self._prev_status = curr_status

        # 3. Relay State Transitions
        if self._prev_relay is not None and self._prev_relay != payload.relayState:
            action = "ACTIVATED (Emergency Valve Cutoff)" if payload.relayState else "DEACTIVATED (Normal Flow)"
            severity = Severity.CRITICAL if payload.relayState else Severity.INFO
            await self._record_event(
                event_type="RELAY_STATE_CHANGED",
                severity=severity,
                description=f"Hardware Relay output {action}",
                source=src,
                gas_adc=payload.gasAdc
            )
        self._prev_relay = payload.relayState

        # 4. Buzzer State Transitions
        if self._prev_buzzer is not None and self._prev_buzzer != payload.buzzerState:
            state_str = "AUDIBLE ALARM ON" if payload.buzzerState else "Alarm silenced (OFF)"
            severity = Severity.WARNING if payload.buzzerState else Severity.INFO
            await self._record_event(
                event_type="BUZZER_STATE_CHANGED",
                severity=severity,
                description=f"Hardware Buzzer: {state_str}",
                source=src,
                gas_adc=payload.gasAdc
            )
        self._prev_buzzer = payload.buzzerState

    async def _record_connection_event(self, online: bool, desc: str):
        severity = Severity.INFO if online else Severity.ERROR
        evt_type = "DEVICE_CONNECTED" if online else "DEVICE_DISCONNECTED"
        await self._record_event(
            event_type=evt_type,
            severity=severity,
            description=desc,
            source="LIVE"
        )

    async def _record_event(self, event_type: str, severity: Severity, description: str, source: str, gas_adc: Optional[int] = None):
        evt_id = f"evt_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        now_str = datetime.now(timezone.utc).isoformat()
        try:
            insert_event(
                event_id=evt_id,
                timestamp=now_str,
                event_type=event_type,
                severity=severity.value,
                description=description,
                source=source,
                gas_adc=gas_adc
            )
        except Exception as e:
            logger.error(f"Failed to record event to database: {e}")

        event_payload = {
            "id": evt_id,
            "timestamp": now_str,
            "eventType": event_type,
            "severity": severity.value,
            "description": description,
            "source": source,
            "gasAdc": gas_adc
        }
        await sse_manager.broadcast("event", event_payload)

    async def _run_demo_tick(self):
        now_utc = datetime.now(timezone.utc).isoformat()
        
        self._demo_adc += self._demo_trend
        if self._demo_adc > 2350:
            self._demo_trend = -20
        elif self._demo_adc < 450:
            self._demo_trend = 10

        if self._demo_adc >= self.critical_threshold:
            status = GasStatus.CRITICAL
            relay = True
            buzzer = True
        elif self._demo_adc >= self.safe_threshold:
            status = GasStatus.WARNING
            relay = False
            buzzer = True
        else:
            status = GasStatus.SAFE
            relay = False
            buzzer = False

        payload = DeviceStatusPayload(
            deviceId="SENTINEL-SIM01",
            gasAdc=self._demo_adc,
            gasStatus=status,
            relayState=relay,
            buzzerState=buzzer,
            temperatureC=27.4,
            humidityPercent=54.2,
            mode=OperatingMode.DEMO,
            uptimeSeconds=int(time.time() % 86400),
            sequence=int(time.time() * 2) % 100000,
            firmwareVersion="DEMO-SIM-1.0",
            timestamp=now_utc
        )
        
        self.is_online = True
        self.consecutive_failures = 0
        self.last_successful_response_time = time.time()
        self.last_response_timestamp_str = now_utc
        self.last_latency_ms = 4.2
        self.last_valid_payload = payload
        
        await self._process_state_transitions(payload, is_live=False, latency=4.2)
        
        try:
            insert_reading(
                timestamp=now_utc,
                gas_adc=payload.gasAdc,
                gas_status=payload.gasStatus.value,
                relay_state=payload.relayState,
                buzzer_state=payload.buzzerState,
                source="DEMO",
                latency_ms=4.2
            )
        except Exception as e:
            logger.error(f"Failed to record demo reading: {e}")
        
        status_resp = self.get_system_status()
        await sse_manager.broadcast("telemetry", status_resp.model_dump())

    def inject_demo_scenario(self, scenario: str, custom_adc: Optional[int] = None):
        if scenario == "SAFE":
            self._demo_adc = 420
            self._demo_trend = 5
        elif scenario == "WARNING":
            self._demo_adc = 1680
            self._demo_trend = 8
        elif scenario == "CRITICAL":
            self._demo_adc = 2650
            self._demo_trend = -5
        elif scenario == "RECOVERY":
            self._demo_adc = 850
            self._demo_trend = -15
        elif scenario == "CUSTOM" and custom_adc is not None:
            self._demo_adc = max(0, min(4095, custom_adc))
            self._demo_trend = 0

    async def _serial_listener_loop(self):
        """Background listener for physically connected USB ESP32 boards."""
        if os.getenv("RENDER"):
            return

        import re
        while self.is_running:
            ser = None
            try:
                import serial.tools.list_ports
                import serial
                # Scan for CH340, CP210x, or target COM10
                com_ports = serial.tools.list_ports.comports()
                target_port = None
                for p in com_ports:
                    if "CH340" in p.description or "CP210" in p.description or "USB-SERIAL" in p.description or p.device == "COM10":
                        target_port = p.device
                        break

                if target_port:
                    try:
                        ser = serial.Serial(target_port, 115200, timeout=1.5)
                        logger.info(f"Connected to ESP32 Hardware via Serial on {target_port} at 115200 baud.")
                        
                        while self.is_running and ser.is_open:
                            raw_line = await asyncio.to_thread(ser.readline)
                            if not raw_line:
                                continue
                            line = raw_line.decode("utf-8", errors="replace").strip()
                            if not line:
                                continue

                            # 1. Parse raw MQ-2 reading from simple firmware
                            m = re.search(r"MQ-2 raw reading:\s*(\d+)", line)
                            if m:
                                adc_val = int(m.group(1))
                                if adc_val >= self.critical_threshold:
                                    g_status = GasStatus.CRITICAL
                                    r_state = True
                                    b_state = True
                                elif adc_val >= self.safe_threshold:
                                    g_status = GasStatus.WARNING
                                    r_state = False
                                    b_state = True
                                else:
                                    g_status = GasStatus.SAFE
                                    r_state = False
                                    b_state = False

                                payload = DeviceStatusPayload(
                                    deviceId=self.device_id or "HC001",
                                    gasAdc=adc_val,
                                    gasStatus=g_status,
                                    relayState=r_state,
                                    buzzerState=b_state,
                                    mode=OperatingMode.LIVE,
                                    firmwareVersion="ESP32-HARDWARE-SERIAL"
                                )
                                await self.ingest_telemetry(payload, client_ip=f"Serial-{target_port}")

                            # 2. Parse JSON telemetry packet
                            elif line.startswith("{") and line.endswith("}"):
                                try:
                                    import json
                                    d = json.loads(line)
                                    if "gasAdc" in d:
                                        payload = DeviceStatusPayload(**d)
                                        await self.ingest_telemetry(payload, client_ip=f"Serial-JSON-{target_port}")
                                except Exception:
                                    pass

                    except (serial.SerialException, PermissionError) as e:
                        logger.debug(f"Serial port {target_port} unavailable: {e}")
                    finally:
                        if ser and ser.is_open:
                            ser.close()
            except ImportError:
                break
            except Exception as e:
                logger.debug(f"Serial listener exception: {e}")

            await asyncio.sleep(2.0)

    async def auto_discover_esp32(self) -> Optional[str]:
        """Safely attempt to locate ESP32 on common local subnets or via USB Serial."""
        if os.getenv("RENDER"):
            logger.info("Subnet scan requested on Render: private network scanning is disabled in cloud environments.")
            return None

        # 1. Check if an active ESP32 is connected via USB Serial
        try:
            import serial.tools.list_ports
            for p in serial.tools.list_ports.comports():
                if "CH340" in p.description or "CP210" in p.description or p.device == "COM10":
                    return f"USB-Serial ({p.device})"
        except Exception:
            pass

        # 2. Check candidate local IPs on current subnet (Hotspot 192.168.137.x or LAN)
        candidate_subnets = ["192.168.137", "192.168.20", "192.168.1"]
        async with httpx.AsyncClient(timeout=0.6) as client:
            for subnet in candidate_subnets:
                tasks = []
                for host_id in range(2, 25):
                    candidate_url = f"http://{subnet}.{host_id}/api/health"
                    tasks.append(self._probe_candidate_ip(client, candidate_url, f"{subnet}.{host_id}"))
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for res in results:
                    if isinstance(res, str):
                        self.esp32_ip = res
                        return res
        return None

    async def _probe_candidate_ip(self, client: httpx.AsyncClient, url: str, ip: str) -> Optional[str]:
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if "status" in data or "deviceId" in data:
                    return ip
        except Exception:
            pass
        return None

device_collector = DeviceCollector()
