import asyncio
import json
import logging
from typing import Set, AsyncGenerator, Any

logger = logging.getLogger("sentinel.sse")

class SSEManager:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    @property
    def client_count(self) -> int:
        return len(self._subscribers)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(queue)
        logger.info(f"New SSE client connected. Total clients: {len(self._subscribers)}")
        try:
            # Send initial connected greeting
            init_payload = json.dumps({"status": "connected", "channel": "sentinel-telemetry"})
            yield f"event: connect\ndata: {init_payload}\n\n"
            
            while True:
                # Wait for data or timeout for keepalive
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield data
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.remove(queue)
            logger.info(f"SSE client disconnected. Total clients: {len(self._subscribers)}")

    async def broadcast(self, event_name: str, payload: Any):
        if not self._subscribers:
            return
            
        json_data = json.dumps(payload)
        message = f"event: {event_name}\ndata: {json_data}\n\n"
        
        # Dispatch to all connected queues without blocking
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass

sse_manager = SSEManager()
