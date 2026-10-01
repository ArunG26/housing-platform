from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]
TARGET = "price"
NON_FEATURE_COLUMNS = ["id"]
REQUIRED_COLUMNS = NON_FEATURE_COLUMNS + FEATURES + [TARGET]
ALPHAS = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0]
RANDOM_STATE = 42


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_training_data(df: pd.DataFrame) -> None:
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")

    if df[REQUIRED_COLUMNS].isna().any().any():
        missing = df[REQUIRED_COLUMNS].isna().sum()
        raise ValueError(f"Training data contains missing values: {missing[missing > 0].to_dict()}")

    if df.duplicated().any():
        raise ValueError("Training data contains duplicate rows")

    if not df["id"].is_unique:
        raise ValueError("id must be unique in the training dataset")

    non_numeric = [column for column in FEATURES + [TARGET] if not pd.api.types.is_numeric_dtype(df[column])]
    if non_numeric:
        raise ValueError(f"Model columns must be numeric: {non_numeric}")


def build_pipeline(alpha: float | None = None) -> Pipeline:
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("regressor", Ridge(alpha=1.0 if alpha is None else alpha)),
        ]
    )


def coefficients_in_original_units(model: Pipeline) -> tuple[dict[str, float], float]:
    """Convert coefficients from standardized-feature space back to original feature units."""
    scaler: StandardScaler = model.named_steps["scaler"]
    regressor: Ridge = model.named_steps["regressor"]

    coefficients = regressor.coef_ / scaler.scale_
    intercept = regressor.intercept_ - np.sum(regressor.coef_ * scaler.mean_ / scaler.scale_)

    return (
        {feature: float(value) for feature, value in zip(FEATURES, coefficients)},
        float(intercept),
    )


def train(data_path: Path, artifact_dir: Path, model_version: str) -> dict:
    df = pd.read_csv(data_path)
    validate_training_data(df)

    X = df[FEATURES]
    y = df[TARGET]

    # Keep the holdout set untouched while model hyperparameters are selected on training data.
    X_train, X_holdout, y_train, y_holdout = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
    )

    search = GridSearchCV(
        estimator=build_pipeline(),
        param_grid={"regressor__alpha": ALPHAS},
        scoring="neg_root_mean_squared_error",
        cv=5,
        refit=True,
    )
    search.fit(X_train, y_train)

    selected_alpha = float(search.best_params_["regressor__alpha"])
    selected_model: Pipeline = search.best_estimator_
    holdout_predictions = selected_model.predict(X_holdout)

    holdout_metrics = {
        "mae": float(mean_absolute_error(y_holdout, holdout_predictions)),
        "rmse": float(mean_squared_error(y_holdout, holdout_predictions) ** 0.5),
        "r2": float(r2_score(y_holdout, holdout_predictions)),
    }

    # Refit the selected configuration on all labeled data for the production artifact.
    final_model = build_pipeline(selected_alpha)
    final_model.fit(X, y)

    coefficients, intercept = coefficients_in_original_units(final_model)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / "housing_model.joblib"
    metadata_path = artifact_dir / "model_metadata.json"

    joblib.dump(final_model, model_path)

    metadata = {
        "model_name": "housing-price-ridge-regression",
        "model_type": "RidgeRegression",
        "model_version": model_version,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "training_dataset": {
            "file_name": data_path.name,
            "sha256": sha256(data_path),
            "row_count": int(len(df)),
            "target": TARGET,
            "excluded_columns": NON_FEATURE_COLUMNS,
        },
        "features": FEATURES,
        "feature_ranges": {
            feature: {
                "min": float(X[feature].min()),
                "max": float(X[feature].max()),
            }
            for feature in FEATURES
        },
        "hyperparameters": {
            "alpha": selected_alpha,
            "standardize_features": True,
            "selection_metric": "RMSE",
            "selection_cv_folds": 5,
            "random_state": RANDOM_STATE,
        },
        "performance": {
            "holdout_fraction": 0.20,
            "holdout_rows": int(len(X_holdout)),
            "holdout_metrics": holdout_metrics,
            "selection_cv_rmse": float(-search.best_score_),
        },
        "coefficients": coefficients,
        "coefficient_basis": "original_feature_units",
        "intercept": intercept,
        "library_versions": {
            "scikit_learn": sklearn.__version__,
            "pandas": pd.__version__,
            "joblib": joblib.__version__,
        },
    }

    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the housing price regression model")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/House Price Dataset.csv"),
        help="Path to the labeled training CSV",
    )
    parser.add_argument(
        "--artifact-dir",
        type=Path,
        default=Path("artifacts"),
        help="Directory where model artifacts are written",
    )
    parser.add_argument("--model-version", default="1.0.0")
    args = parser.parse_args()

    metadata = train(args.data, args.artifact_dir, args.model_version)
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
