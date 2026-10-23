import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
DEMO_DIR = DATA_DIR / "demo"

class Settings(BaseModel):
    PROJECT_NAME: str = "UK Wind Forecast Accuracy Dashboard"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Elexon API Endpoints
    ELEXON_BASE_URL: str = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    FUELHH_ENDPOINT: str = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
    WINDFOR_ENDPOINT: str = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"
    
    # Request timeouts and retries
    API_TIMEOUT_SECONDS: float = float(os.getenv("API_TIMEOUT_SECONDS", "30.0"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    
    # Cache settings
    ENABLE_CACHE: bool = os.getenv("ENABLE_CACHE", "true").lower() in ("true", "1", "yes")
    CACHE_DIR: Path = CACHE_DIR
    DEMO_DIR: Path = DEMO_DIR
    
    # Target period
    DEFAULT_START_DATE: str = "2026-01-01"
    DEFAULT_END_DATE: str = "2026-01-31"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

settings = Settings()
