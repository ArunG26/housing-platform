from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env.local",
        env_file_encoding="utf-8",
        env_prefix="",
        case_sensitive=False,
    )

    environment: str = "local"
    service_version: str = "1.1.0"
    platform_version: str = "1.1.0"

    bff_internal_token: str
    ml_service_url: str = "http://localhost:8000"
    estimator_ml_token: str
    ml_connect_timeout_seconds: float = 2.0
    ml_read_timeout_seconds: float = 5.0


settings = Settings()
