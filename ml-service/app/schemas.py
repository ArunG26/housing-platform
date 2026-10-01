from __future__ import annotations

from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field

MAX_BATCH_SIZE = 100

class HousingFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    square_footage: float = Field(gt=0, description="Property living area in square feet")
    bedrooms: int = Field(ge=0, le=20)
    bathrooms: float = Field(gt=0, le=20)
    year_built: int = Field(ge=1800, le=2100)
    lot_size: float = Field(gt=0, description="Lot size in square feet")
    distance_to_city_center: float = Field(ge=0)
    school_rating: float = Field(ge=0, le=10)

BatchHousingFeatures = Annotated[
    list[HousingFeatures],
    Field(
        min_length=1,
        max_length=MAX_BATCH_SIZE,
    ),
]

class SinglePredictionResponse(BaseModel):
    prediction: float
    model_version: str


class BatchPredictionResponse(BaseModel):
    predictions: list[float]
    model_version: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str | None = None
