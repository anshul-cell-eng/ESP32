import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    APP_NAME: str = "SENTINEL — Smart LPG Safety Monitoring Platform"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Device authentication for HTTPS Ingestion
    DEVICE_ID: str = "HC001"
    ESP32_IP: str = os.getenv("ESP32_IP", "192.168.1.100")
    SENTINEL_DEVICE_TOKEN: str = os.getenv("SENTINEL_DEVICE_TOKEN", os.getenv("DEVICE_API_KEY", "sentinel_dev_secret_token_2026"))
    POLLING_INTERVAL_SECONDS: float = 1.0
    STALE_TIMEOUT_SECONDS: float = 5.0
    REQUEST_TIMEOUT_SECONDS: float = 2.0
    INGEST_MIN_INTERVAL_MS: int = 200 # Rate limiting: at least 200ms between pushes
    
    # Thresholds
    SAFE_THRESHOLD: int = 1500
    CRITICAL_THRESHOLD: int = 2000
    
    # Mode
    MODE: str = "LIVE"  # LIVE or DEMO
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    DATABASE_PATH: str = "backend/sentinel.db"
    
    # CORS Origins
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL")
    ALLOWED_ORIGINS: Optional[str] = os.getenv("ALLOWED_ORIGINS")
    
    @property
    def cors_origins(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]
        if self.FRONTEND_URL:
            for u in self.FRONTEND_URL.split(","):
                clean = u.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        if self.ALLOWED_ORIGINS:
            for u in self.ALLOWED_ORIGINS.split(","):
                clean = u.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        return origins

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()
