from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

VALID_PAYLOAD = {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}
ESTIMATOR_HEADERS = {
    "Authorization": f"Bearer {settings.estimator_ml_token}"
}
MARKET_HEADERS = {
    "Authorization": f"Bearer {settings.market_ml_token}"
}

def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert body["model_loaded"] is True
        assert body["model_version"] == "1.0.0"

def test_model_info_contains_metrics_and_coefficients() -> None:
    with TestClient(app) as client:
        response = client.get("/model-info", headers=ESTIMATOR_HEADERS)
        assert response.status_code == 200
        body = response.json()
        assert body["model_type"] == "RidgeRegression"
        assert "coefficients" in body
        assert "holdout_metrics" in body["performance"]

def test_market_identity_cannot_read_model_info() -> None:
    with TestClient(app) as client:
        response = client.get("/model-info", headers=MARKET_HEADERS)
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"

def test_single_prediction_as_batch_of_one() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[VALID_PAYLOAD],
            headers=ESTIMATOR_HEADERS
            | {"X-Request-ID": "ml-request-1"},
        )

        assert response.status_code == 200

        body = response.json()

        assert len(body["predictions"]) == 1
        assert isinstance(body["predictions"][0], float)
        assert body["predictions"][0] > 0
        assert body["model_version"] == "1.0.0"

        assert response.headers["x-request-id"] == "ml-request-1"

def test_batch_prediction_for_market_service() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[VALID_PAYLOAD, VALID_PAYLOAD],
            headers=MARKET_HEADERS,
        )

        assert response.status_code == 200

        body = response.json()

        assert len(body["predictions"]) == 2
        assert all(
            isinstance(prediction, float)
            for prediction in body["predictions"]
        )

def test_prediction_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"

def test_max_batch_size_is_accepted() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[VALID_PAYLOAD] * 100,
            headers=ESTIMATOR_HEADERS,
        )

    assert response.status_code == 200

    body = response.json()

    assert len(body["predictions"]) == 100

def test_batch_limit_is_enforced() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[VALID_PAYLOAD] * 101,
            headers=ESTIMATOR_HEADERS,
        )

    assert response.status_code == 422

def test_empty_batch_is_rejected() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[],
            headers=ESTIMATOR_HEADERS,
        )

    assert response.status_code == 422

def test_invalid_school_rating_is_rejected() -> None:
    payload = {
        **VALID_PAYLOAD,
        "school_rating": 11,
    }

    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[payload],
            headers=ESTIMATOR_HEADERS,
        )

    assert response.status_code == 422

def test_unknown_field_is_rejected() -> None:
    payload = {
        **VALID_PAYLOAD,
        "unknown": "value",
    }

    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json=[payload],
            headers=ESTIMATOR_HEADERS,
        )

    assert response.status_code == 422