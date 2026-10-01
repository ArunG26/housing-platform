from fastapi.testclient import TestClient

from app.config import settings
from app.main import app, get_ml_client


class FakeMlClient:
    async def predict(self, features):
        return {"prediction": 248171.25, "model_version": "1.0.0"}

    async def model_info(self):
        return {
            "model_type": "RidgeRegression",
            "model_version": "1.0.0",
            "performance": {"holdout_metrics": {"r2": 0.989}},
        }

    async def health(self):
        return True


fake = FakeMlClient()
app.dependency_overrides[get_ml_client] = lambda: fake

VALID_PAYLOAD = {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}
AUTH_HEADERS = {
    "Authorization": f"Bearer {settings.bff_internal_token}",
    "X-User-Role": "ANALYST",
}


def test_estimate():
    headers = AUTH_HEADERS | {"X-Request-ID": "request-123"}
    with TestClient(app) as client:
        response = client.post("/api/v1/estimates", json=VALID_PAYLOAD, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["estimated_price"] == 248171.25
    assert body["model_version"] == "1.0.0"
    assert body["request_id"] == "request-123"
    assert response.headers["x-request-id"] == "request-123"


def test_estimate_requires_internal_authentication():
    with TestClient(app) as client:
        response = client.post("/api/v1/estimates", json=VALID_PAYLOAD)
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_validation_rejects_invalid_school_rating():
    payload = VALID_PAYLOAD | {"school_rating": 11}
    with TestClient(app) as client:
        response = client.post("/api/v1/estimates", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_model_info_proxy():
    with TestClient(app) as client:
        response = client.get("/api/v1/model-info", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["model_version"] == "1.0.0"


def test_readiness_is_available_without_internal_authentication():
    with TestClient(app) as client:
        response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["ml_service_reachable"] is True
