import uvicorn
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    from app.config import settings
    
    # Read port from Render's $PORT or fallback to settings.PORT
    port = int(os.environ.get("PORT", settings.PORT))
    host = os.environ.get("HOST", settings.HOST)
    
    print(f"Starting {settings.APP_NAME} v{settings.VERSION}...")
    print(f"Listening on http://{host}:{port}")
    if os.getenv("DATABASE_URL"):
        print("Persistent Database: PostgreSQL (Render Managed)")
    else:
        print(f"Persistent Database: SQLite Local Fallback ({settings.DATABASE_PATH})")
    print(f"Configured Ingestion Device Token: {settings.SENTINEL_DEVICE_TOKEN[:4]}****")
    
    uvicorn.run("app.main:app", host=host, port=port, reload=False, log_level="info")
