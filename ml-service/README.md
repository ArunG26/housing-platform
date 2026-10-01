# Housing Price Prediction API — Task 1

A small, versioned ML inference service built with Python, scikit-learn, FastAPI and Docker.

## Design

Training is intentionally separated from serving:

```text
Labeled CSV -> validation -> train/holdout split -> Ridge selection with CV
            -> final fit on all labeled data -> model.joblib + metadata.json

Client -> FastAPI -> Pydantic validation -> in-memory model -> prediction
```

The `id` column is excluded because it identifies a row rather than describing a property. The seven model features are numerical. The model uses `StandardScaler + Ridge`; regularization is useful because the supplied features are highly collinear.

## Data contract

Features:
- `square_footage`
- `bedrooms`
- `bathrooms`
- `year_built`
- `lot_size`
- `distance_to_city_center`
- `school_rating`

Target: `price`

## Train

```bash
python -m training.train
```

This writes:
- `artifacts/housing_model.joblib`
- `artifacts/model_metadata.json`

The hyperparameter is selected only on the training partition using 5-fold CV. The untouched 20% holdout is then used for final evaluation. Finally, the selected configuration is refit on all 50 labeled rows for the serving artifact.

## Generate predictions for the supplied inference file

```bash
python -m training.predict_file
```

Output: `artifacts/test_predictions.csv`

## Run API locally

```bash
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Swagger UI: `http://localhost:8000/docs`

Endpoints:
- `POST /predict` — single object or batch array
- `GET /model-info` — coefficients, version, training lineage and evaluation metrics
- `GET /health` — serving readiness

## Example request

```json
{
  "square_footage": 1550,
  "bedrooms": 3,
  "bathrooms": 2,
  "year_built": 1997,
  "lot_size": 6800,
  "distance_to_city_center": 4.1,
  "school_rating": 7.6
}
```

## Test

```bash
pytest -q
```

## Docker

```bash
docker build -t housing-price-ml:1.0.0 .
docker run --rm -p 8000:8000 housing-price-ml:1.0.0
```

Then open `http://localhost:8000/docs`.

## Engineering choices worth discussing

- Training and inference are separate concerns; the API never retrains a model on startup or per request.
- The model artifact is loaded once during FastAPI lifespan startup.
- The training dataset SHA-256, model version, library versions and feature ranges are captured for traceability.
- Pydantic performs transport/domain validation; feature order is still controlled server-side from model metadata.
- The model exposes coefficients in original feature units even though training uses standardized inputs.
- The supplied prediction CSV has no target, so it is inference data, not an evaluation test set.
- The features are strongly collinear; coefficients should be interpreted as model parameters, not causal effects.
