import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicFix API"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "supersecretkeyforhackathoncivicfix2026!@#"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week for easy testing
    
    # Database
    DATABASE_URL: str = "sqlite:///./civicfix.db"
    
    # Uploads
    UPLOAD_DIR: Path = Path("uploads")
    
    # AI Config
    GEMINI_API_KEY: str | None = None
    YOLO_MODEL_PATH: str = "D:/Computer_Vision/yolo11n.pt"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Create upload directory if it doesn't exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
