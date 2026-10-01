from __future__ import annotations

from typing import Any

import httpx

from app.config import settings
from app.observability import outgoing_traceparent, request_id
from app.schemas import HousingFeatures


class MlServiceError(RuntimeError):
    pass


class MlClient:
    def __init__(self, base_url: str | None = None) -> None:
        timeout = httpx.Timeout(
            connect=settings.ml_connect_timeout_seconds,
            read=settings.ml_read_timeout_seconds,
            write=settings.ml_read_timeout_seconds,
            pool=settings.ml_connect_timeout_seconds,
        )
        self._client = httpx.AsyncClient(
            base_url=(base_url or settings.ml_service_url).rstrip("/"),
            timeout=timeout,
        )

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.estimator_ml_token}",
            "X-Request-ID": request_id(),
            "traceparent": outgoing_traceparent(),
        }

    async def close(self) -> None:
        await self._client.aclose()

    async def predict(self, features: HousingFeatures) -> dict[str, Any]:
        try:
            response = await self._client.post("/predict", json=[features.model_dump()], headers=self._headers())
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise MlServiceError("ML service timed out") from exc
        except httpx.HTTPStatusError as exc:
            raise MlServiceError(f"ML service returned HTTP {exc.response.status_code}") from exc
        except httpx.HTTPError as exc:
            raise MlServiceError("ML service is unavailable") from exc
        payload = response.json()
        predictions = payload.get("predictions")
        if not predictions or len(predictions) != 1:
            raise MlServiceError("ML service returned an invalid prediction response")

        return {
            "prediction": predictions[0],
            "model_version": payload["model_version"],
        }

    async def model_info(self) -> dict[str, Any]:
        try:
            response = await self._client.get("/model-info", headers=self._headers())
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise MlServiceError("Unable to retrieve model information") from exc
        return response.json()

    async def health(self) -> bool:
        try:
            response = await self._client.get("/ready", headers={"X-Request-ID": request_id(), "traceparent": outgoing_traceparent()})
            return response.status_code == 200
        except httpx.HTTPError:
            return False
