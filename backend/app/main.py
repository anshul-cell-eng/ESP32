import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.database import init_db
from app.collector import device_collector
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sentinel")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SENTINEL Database...")
    init_db()
    if os.getenv("TESTING") != "1":
        logger.info("Starting Background Collector...")
        await device_collector.start()
    yield
    if os.getenv("TESTING") != "1":
        logger.info("Stopping Background Collector...")
        await device_collector.stop()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Backend service, authenticated telemetry ingestion hub and API for the SENTINEL Smart LPG Safety Monitoring Platform.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")
