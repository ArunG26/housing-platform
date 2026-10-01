from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Request

from app.config import settings
from app.errors import install_error_handlers
from app.ml_client import MlClient, MlServiceError
from app.observability import RequestContextMiddleware, configure_logging, log_event, request_id
from app.schemas import EstimateResponse, HealthResponse, HousingFeatures
from app.security import require_bff

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ml_client = MlClient()
    yield
    await app.state.ml_client.close()


app = FastAPI(
    title="Property Value Estimator API",
    description="Application backend for property estimates. Delegates inference to the shared ML service.",
    version=settings.service_version,
    lifespan=lifespan,
)
app.add_middleware(RequestContextMiddleware)
install_error_handlers(app)


def get_ml_client(request: Request) -> MlClient:
    return request.app.state.ml_client


@app.get("/live", tags=["Operations"])
async def live() -> dict:
    return {"status": "alive", "service": "estimator-service", "service_version": settings.service_version}


@app.get("/ready", response_model=HealthResponse, tags=["Operations"])
async def ready(ml_client: MlClient = Depends(get_ml_client)) -> HealthResponse:
    reachable = await ml_client.health()
    if not reachable:
        raise HTTPException(status_code=503, detail="ML service is unavailable")
    return HealthResponse(status="healthy", ml_service_reachable=True)


@app.get("/health", response_model=HealthResponse, tags=["Operations"])
async def health(ml_client: MlClient = Depends(get_ml_client)) -> HealthResponse:
    return await ready(ml_client)


@app.get("/version", tags=["Operations"])
async def version() -> dict:
    return {
        "service": "estimator-service",
        "service_version": settings.service_version,
        "platform_version": settings.platform_version,
        "api_version": "v1",
    }


@app.get("/api/v1/model-info", tags=["Model"], dependencies=[Depends(require_bff)])
async def model_info(ml_client: MlClient = Depends(get_ml_client)) -> dict:
    try:
        return await ml_client.model_info()
    except MlServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post(
    "/api/v1/estimates",
    response_model=EstimateResponse,
    tags=["Estimator"],
    dependencies=[Depends(require_bff)],
)
async def create_estimate(
    features: HousingFeatures,
    ml_client: MlClient = Depends(get_ml_client),
) -> EstimateResponse:
    try:
        result = await ml_client.predict(features)
    except MlServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    log_event("INFO", "create_estimate", model_version=result.get("model_version"), status=200)
    return EstimateResponse(
        request_id=request_id(),
        estimated_price=float(result["prediction"]),
        model_version=str(result["model_version"]),
        estimated_at_utc=datetime.now(timezone.utc),
    )
