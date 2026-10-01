from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env.local",
        env_file_encoding="utf-8",
        env_prefix="",
        case_sensitive=False,
    )

    environment: str = "local"
    service_version: str = "1.1.0"
    platform_version: str = "1.1.0"
    max_batch_size: int = 100
    estimator_ml_token: str
    market_ml_token: str
    model_path: Path = PROJECT_ROOT / "artifacts" / "housing_model.joblib"
    model_metadata_path: Path = PROJECT_ROOT / "artifacts" / "model_metadata.json"


settings = Settings()
MODEL_PATH = settings.model_path
METADATA_PATH = settings.model_metadata_path
ENVIRONMENT = settings.environment
SERVICE_VERSION = settings.service_version
PLATFORM_VERSION = settings.platform_version
MAX_BATCH_SIZE = settings.max_batch_size
ESTIMATOR_ML_TOKEN = settings.estimator_ml_token
MARKET_ML_TOKEN = settings.market_ml_token
