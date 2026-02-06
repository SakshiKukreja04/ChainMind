"""
Model trainer for the XGBoost demand forecasting model.

Supports two data sources:
  1. Historical JSON export from SalesHistory MongoDB collection
     (produced by server/scripts/seedSalesHistory.js)
  2. Synthetic fallback when no export file exists

Pipeline:
  load data  →  sliding-window samples  →  feature engineering  →  train  →  save
"""

import os
import json
import logging
import datetime
from collections import defaultdict

import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from config import (
    MODEL_DIR,
    MODEL_PATH,
    XGB_PARAMS,
    SYNTHETIC_SAMPLES,
    SYNTHETIC_HISTORY_LEN,
    SALES_HISTORY_JSON,
    MIN_HISTORY_LEN,
)
from utils.synthetic_data import generate_dataset
from utils.feature_engineering import extract_features

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Historical-data loader
# ─────────────────────────────────────────────────────────────────

def _load_historical_json(path: str) -> list[dict] | None:
    """
    Load the JSON export produced by the Node.js seeder.

    Returns a list of dicts: { date, quantitySold, city, productId, ... }
    or None if the file doesn't exist / is empty.
    """
    if not os.path.exists(path):
        logger.info("No historical JSON at %s — falling back to synthetic data", path)
        return None

    with open(path, "r") as f:
        rows = json.load(f)

    if not rows:
        return None

    logger.info("Loaded %d rows from %s", len(rows), path)
    return rows


def _build_sliding_windows(rows: list[dict], window_size: int = 30) -> pd.DataFrame:
    """
    Convert flat daily rows into sliding-window training samples.

    Groups by (productId, city), sorts by date, then slides a window
    of `window_size` days across the series. The label is the *next day*
    after the window.

    Returns DataFrame with columns:
        salesHistory, currentStock, leadTimeDays, nextDayDemand, city, ref_date
    """
    # Group by product × city
    groups: dict[str, list] = defaultdict(list)
    for r in rows:
        key = f"{r['productId']}|{r['city']}"
        groups[key].append(r)

    samples = []
    rng = np.random.default_rng(42)

    for key, series in groups.items():
        series.sort(key=lambda r: r["date"])
        sales = [r["quantitySold"] for r in series]
        dates = [r["date"] for r in series]
        city = series[0]["city"]

        if len(sales) < window_size + 1:
            continue  # not enough data

        for i in range(len(sales) - window_size):
            window = sales[i : i + window_size]
            next_day = float(sales[i + window_size])
            ref = dates[i + window_size]  # label date

            samples.append({
                "salesHistory": window,
                "currentStock": int(rng.integers(0, max(1, int(np.mean(window) * 15)))),
                "leadTimeDays": int(rng.integers(1, 22)),
                "nextDayDemand": next_day,
                "city": city,
                "ref_date": ref,
            })

    logger.info("Built %d sliding-window samples from historical data", len(samples))
    return pd.DataFrame(samples)


# ─────────────────────────────────────────────────────────────────
# Feature-matrix builder
# ─────────────────────────────────────────────────────────────────

def _build_Xy(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Convert DataFrame into (X, y, feature_names)."""
    feature_dicts: list[dict] = []
    for _, row in df.iterrows():
        fd = extract_features(
            row["salesHistory"],
            row["currentStock"],
            row["leadTimeDays"],
            city=row.get("city"),
            ref_date=row.get("ref_date"),
        )
        feature_dicts.append(fd)

    feature_names = sorted(feature_dicts[0].keys())
    X = np.array([[fd[k] for k in feature_names] for fd in feature_dicts])
    y = df["nextDayDemand"].values.astype(float)
    return X, y, feature_names


# ─────────────────────────────────────────────────────────────────
# Training pipeline
# ─────────────────────────────────────────────────────────────────

def train_model(
    n_samples: int = SYNTHETIC_SAMPLES,
    history_len: int = SYNTHETIC_HISTORY_LEN,
    seed: int = 42,
) -> dict:
    """
    Full training pipeline.

    1. Try to load historical SalesHistory JSON export.
    2. If unavailable, fall back to synthetic data generation.
    3. Engineer features  →  train XGBoost  →  evaluate  →  save.

    Returns dict: { mae, r2, model_path, data_source }
    """
    # 1. Try historical data first
    historical = _load_historical_json(SALES_HISTORY_JSON)
    data_source = "historical"

    if historical is not None and len(historical) >= 500:
        df = _build_sliding_windows(historical, window_size=30)
        if len(df) < 200:
            logger.warning(
                "Only %d samples from historical data — supplementing with synthetic",
                len(df),
            )
            synth = generate_dataset(n_samples, history_len, seed)
            df = pd.concat([df, synth], ignore_index=True)
            data_source = "historical+synthetic"
    else:
        logger.info("Generating %d synthetic samples …", n_samples)
        df = generate_dataset(n_samples, history_len, seed)
        data_source = "synthetic"

    logger.info("Training data: %d samples (source: %s)", len(df), data_source)

    # 2. Engineer features
    logger.info("Engineering features …")
    X, y, feature_names = _build_Xy(df)

    # 3. Train / evaluate
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=seed
    )

    logger.info("Training XGBRegressor (n=%d features) …", X.shape[1])
    model = XGBRegressor(**XGB_PARAMS)
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))
    logger.info("Evaluation  → MAE=%.3f  R²=%.3f", mae, r2)

    # 4. Persist
    os.makedirs(MODEL_DIR, exist_ok=True)
    artifact = {"model": model, "feature_names": feature_names}
    joblib.dump(artifact, MODEL_PATH)
    logger.info("Model saved → %s", MODEL_PATH)

    return {"mae": mae, "r2": r2, "model_path": MODEL_PATH, "data_source": data_source}


def retrain(**kwargs) -> dict:
    """Wrapper for cron / scheduled retraining."""
    logger.info("=== Scheduled retrain started ===")
    result = train_model(**kwargs)
    logger.info("=== Scheduled retrain finished ===")
    return result


# ── CLI entry-point ──────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    metrics = train_model()
    print(
        f"\n✅  Training complete  →  MAE={metrics['mae']:.3f}  R²={metrics['r2']:.3f}"
        f"  (source: {metrics['data_source']})"
    )
    print(f"   Model saved to {metrics['model_path']}")
