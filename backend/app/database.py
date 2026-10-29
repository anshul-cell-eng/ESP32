import os
import logging
import sqlite3
from typing import List, Optional, Dict, Any
from contextlib import contextmanager

logger = logging.getLogger("sentinel.database")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Optional psycopg2 import for PostgreSQL on Render
try:
    import psycopg2
    import psycopg2.extras
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


def get_database_url() -> Optional[str]:
    """Retrieve database URL from environment (Render PostgreSQL)."""
    if os.getenv("TESTING") == "1":
        return None
    url = os.getenv("DATABASE_URL")
    if url:
        # Render sometimes provides postgres:// which can be normalized to postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    return None


def is_postgres() -> bool:
    """Return True if PostgreSQL should be used."""
    url = get_database_url()
    return bool(url and PSYCOPG2_AVAILABLE)


import tempfile

def get_sqlite_path() -> str:
    if os.getenv("TESTING") == "1":
        return os.path.join(tempfile.gettempdir(), "sentinel_test.db")
    return os.path.join(BASE_DIR, "sentinel.db")


@contextmanager
def get_connection():
    """Context manager yielding a database connection with dict-like row access."""
    if is_postgres():
        db_url = get_database_url()
        conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        db_path = get_sqlite_path()
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path, check_same_thread=False, timeout=10.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA busy_timeout = 5000;")
        except Exception:
            pass
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def check_db_health() -> bool:
    """Safely check if the active database is reachable and operational."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor() if hasattr(conn, 'cursor') else conn
            cursor.execute("SELECT 1")
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


def init_db():
    """Create database tables and indices safely for either PostgreSQL or SQLite."""
    use_pg = is_postgres()
    logger.info(f"Initializing SENTINEL Database (Engine: {'PostgreSQL' if use_pg else 'SQLite'})...")

    with get_connection() as conn:
        cursor = conn.cursor() if hasattr(conn, 'cursor') else conn

        if use_pg:
            # PostgreSQL DDL
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS readings (
                    id BIGSERIAL PRIMARY KEY,
                    timestamp VARCHAR(64) NOT NULL,
                    gas_adc INTEGER NOT NULL,
                    gas_status VARCHAR(32) NOT NULL,
                    relay_state BOOLEAN NOT NULL,
                    buzzer_state BOOLEAN NOT NULL,
                    source VARCHAR(32) NOT NULL,
                    latency_ms REAL
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_readings_source ON readings(source);")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id VARCHAR(128) PRIMARY KEY,
                    timestamp VARCHAR(64) NOT NULL,
                    event_type VARCHAR(64) NOT NULL,
                    severity VARCHAR(32) NOT NULL,
                    description TEXT NOT NULL,
                    source VARCHAR(32) NOT NULL,
                    gas_adc INTEGER
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    key VARCHAR(128) PRIMARY KEY,
                    value TEXT NOT NULL
                );
            """)
        else:
            # SQLite DDL
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    gas_adc INTEGER NOT NULL,
                    gas_status TEXT NOT NULL,
                    relay_state INTEGER NOT NULL,
                    buzzer_state INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    latency_ms REAL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_readings_source ON readings(source);")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    source TEXT NOT NULL,
                    gas_adc INTEGER
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)


def insert_reading(
    timestamp: str,
    gas_adc: int,
    gas_status: str,
    relay_state: bool,
    buzzer_state: bool,
    source: str = "LIVE",
    latency_ms: Optional[float] = None
) -> int:
    """Insert a sensor reading into the persistent database."""
    use_pg = is_postgres()

    with get_connection() as conn:
        cursor = conn.cursor() if hasattr(conn, 'cursor') else conn

        if use_pg:
            query = """
                INSERT INTO readings (timestamp, gas_adc, gas_status, relay_state, buzzer_state, source, latency_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """
            cursor.execute(query, (timestamp, gas_adc, gas_status, bool(relay_state), bool(buzzer_state), source, latency_ms))
            row = cursor.fetchone()
            return row["id"] if isinstance(row, dict) else row[0]
        else:
            query = """
                INSERT INTO readings (timestamp, gas_adc, gas_status, relay_state, buzzer_state, source, latency_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(query, (timestamp, gas_adc, gas_status, int(relay_state), int(buzzer_state), source, latency_ms))
            return cursor.lastrowid


def get_readings(
    limit: int = 100,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None,
    source: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve historical sensor readings."""
    use_pg = is_postgres()
    param_placeholder = "%s" if use_pg else "?"

    query = "SELECT id, timestamp, gas_adc, gas_status, relay_state, buzzer_state, source, latency_ms FROM readings WHERE 1=1"
    params = []

    if from_time:
        query += f" AND timestamp >= {param_placeholder}"
        params.append(from_time)
    if to_time:
        query += f" AND timestamp <= {param_placeholder}"
        params.append(to_time)
    if source:
        query += f" AND source = {param_placeholder}"
        params.append(source)

    query += f" ORDER BY timestamp DESC LIMIT {param_placeholder}"
    params.append(limit)

    with get_connection() as conn:
        cursor = conn.cursor() if hasattr(conn, 'cursor') else conn
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "gasAdc": r["gas_adc"],
                "gasStatus": r["gas_status"],
                "relayState": bool(r["relay_state"]),
                "buzzerState": bool(r["buzzer_state"]),
                "source": r["source"],
                "latencyMs": r["latency_ms"]
            })
        return list(reversed(result))


def insert_event(
    event_id: str,
    timestamp: str,
    event_type: str,
    severity: str,
    description: str,
    source: str = "LIVE",
    gas_adc: Optional[int] = None
):
    """Insert or replace an anomalous event item."""
    use_pg = is_postgres()

    with get_connection() as conn:
        cursor = conn.cursor() if hasattr(conn, 'cursor') else conn

        if use_pg:
            query = """
                INSERT INTO events (id, timestamp, event_type, severity, description, source, gas_adc)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    timestamp = EXCLUDED.timestamp,
                    event_type = EXCLUDED.event_type,
                    severity = EXCLUDED.severity,
                    description = EXCLUDED.description,
                    source = EXCLUDED.source,
                    gas_adc = EXCLUDED.gas_adc;
            """
            cursor.execute(query, (event_id, timestamp, event_type, severity, description, source, gas_adc))
        else:
            query = """
                INSERT OR REPLACE INTO events (id, timestamp, event_type, severity, description, source, gas_adc)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(query, (event_id, timestamp, event_type, severity, description, source, gas_adc))


def get_events(
    limit: int = 50,
    severity: Optional[str] = None,
    source: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve deduplicated events from database."""
    use_pg = is_postgres()
    param_placeholder = "%s" if use_pg else "?"

    query = "SELECT id, timestamp, event_type, severity, description, source, gas_adc FROM events WHERE 1=1"
    params = []

    if severity:
        query += f" AND severity = {param_placeholder}"
        params.append(severity)
    if source:
        query += f" AND source = {param_placeholder}"
        params.append(source)

    query += f" ORDER BY timestamp DESC LIMIT {param_placeholder}"
    params.append(limit)

    with get_connection() as conn:
        cursor = conn.cursor() if hasattr(conn, 'cursor') else conn
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "eventType": r["event_type"],
                "severity": r["severity"],
                "description": r["description"],
                "source": r["source"],
                "gasAdc": r["gas_adc"]
            })
        return result
