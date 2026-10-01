from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd

FEATURES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate predictions for an unlabeled CSV")
    parser.add_argument("--input", type=Path, default=Path("data/Test Data For Prediction.csv"))
    parser.add_argument("--model", type=Path, default=Path("artifacts/housing_model.joblib"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/test_predictions.csv"))
    args = parser.parse_args()

    frame = pd.read_csv(args.input)
    missing = [column for column in FEATURES if column not in frame.columns]
    if missing:
        raise ValueError(f"Prediction input is missing columns: {missing}")

    model = joblib.load(args.model)
    result = frame.copy()
    result["predicted_price"] = model.predict(frame[FEATURES])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    print(result.to_string(index=False))


if __name__ == "__main__":
    main()
