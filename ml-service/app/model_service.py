from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline

from app.schemas import HousingFeatures


class ModelService:
    def __init__(self, model_path: Path, metadata_path: Path) -> None:
        self.model_path = model_path
        self.metadata_path = metadata_path
        self.model: Pipeline | None = None
        self.metadata: dict | None = None

    @property
    def loaded(self) -> bool:
        return self.model is not None and self.metadata is not None

    def load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model artifact not found: {self.model_path}")
        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Model metadata not found: {self.metadata_path}")

        self.model = joblib.load(self.model_path)
        self.metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))

    def predict(self, records: list[HousingFeatures]) -> list[float]:
        if not self.loaded:
            raise RuntimeError("Model service has not been loaded")

        feature_order: list[str] = self.metadata["features"]
        frame = pd.DataFrame([record.model_dump() for record in records])
        frame = frame[feature_order]
        return [float(value) for value in self.model.predict(frame)]

    @property
    def version(self) -> str | None:
        if not self.metadata:
            return None
        return self.metadata.get("model_version")
