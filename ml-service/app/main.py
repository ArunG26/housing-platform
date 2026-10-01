from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

from app.config import METADATA_PATH, MODEL_PATH, PLATFORM_VERSION, SERVICE_VERSION
from app.errors import install_error_handlers
from app.model_service import ModelService
from app.observability import RequestContextMiddleware, configure_logging, log_event
from app.schemas import BatchHousingFeatures, BatchPredictionResponse, HealthResponse
from app.security import require_scope

model_service = ModelService(MODEL_PATH, METADATA_PATH)
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    model_service.load()
    yield


app = FastAPI(
    title="Housing Price Prediction API",
    description="Versioned inference API for the housing price regression model.",
    version=SERVICE_VERSION,
    lifespan=lifespan,
)
app.add_middleware(RequestContextMiddleware)
install_error_handlers(app)


@app.get("/live", tags=["Operations"])
def live() -> dict:
    return {"status": "alive", "service": "ml-service", "service_version": SERVICE_VERSION}


@app.get("/ready", response_model=HealthResponse, tags=["Operations"])
def ready() -> HealthResponse:
    if not model_service.loaded:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    return HealthResponse(status="healthy", model_loaded=True, model_version=model_service.version)


@app.get("/health", response_model=HealthResponse, tags=["Operations"])
def health() -> HealthResponse:
    return ready()


@app.get("/version", tags=["Operations"])
def version() -> dict:
    return {
        "service": "ml-service",
        "service_version": SERVICE_VERSION,
        "platform_version": PLATFORM_VERSION,
        "api_version": "v1",
        "model_version": model_service.version,
    }


@app.get("/model-info", tags=["Model"])
def model_info(_: Annotated[str, Depends(require_scope("ml:model-read"))]) -> dict:
    if not model_service.loaded or model_service.metadata is None:
        raise HTTPException(status_code=503, detail="Model metadata is not loaded")
    return model_service.metadata


@app.post(
    "/predict",
    response_model=BatchPredictionResponse,
    tags=["Prediction"],
)
def predict(
    payload: BatchHousingFeatures,
    _: Annotated[str, Depends(require_scope("ml:predict"))],
) -> BatchPredictionResponse:
    if not model_service.loaded:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    predictions = model_service.predict(payload)

    log_event(
        "INFO",
        "predict",
        model_version=model_service.version,
        batch_size=len(payload),
        status=200,
    )

    return BatchPredictionResponse(
        predictions=predictions,
        model_version=model_service.version or "unknown",
    )