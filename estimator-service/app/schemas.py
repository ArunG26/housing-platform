from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HousingFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    square_footage: float = Field(gt=0)
    bedrooms: int = Field(ge=0, le=20)
    bathrooms: float = Field(gt=0, le=20)
    year_built: int = Field(ge=1800, le=2100)
    lot_size: float = Field(gt=0)
    distance_to_city_center: float = Field(ge=0)
    school_rating: float = Field(ge=0, le=10)


class EstimateResponse(BaseModel):
    request_id: str
    estimated_price: float
    model_version: str
    estimated_at_utc: datetime


class HealthResponse(BaseModel):
    status: str
    ml_service_reachable: bool
