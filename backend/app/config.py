from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./roadscan.db"
    SECRET_KEY: str = "roadscan-super-secret-key-2026-kazntu-diploma"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 2880  # 2 days
    UPLOAD_DIR: str = "./uploads"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
