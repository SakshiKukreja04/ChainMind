"""
Model trainer for the XGBoost demand forecasting model.

Responsibilities:
  1. Generate / load training data
  2. Engineer features
  3. Train an XGBRegressor
  4. Persist the model as a .pkl (joblib)
  5. Provide a `retrain()` entry-point suitable for cron / scheduler
"""

import os
import logging
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from config import MODEL_DIR, MODEL_PATH, XGB_PARAMS, SYNTHETIC_SAMPLES, SYNTHETIC_HISTORY_LEN
from utils.synthetic_data import generate_dataset
from utils.feature_engineering import extract_features

logger = logging.getLogger(__name__)


def _build_Xy(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Convert raw DataFrame into feature matrix X and label vector y."""
    feature_dicts: list[dict] = []
    for _, row in df.iterrows():
        fd = extract_features(
            row["salesHistory"],
            row["currentStock"],
            row["leadTimeDays"],
        )
        feature_dicts.append(fd)

    feature_names = sorted(feature_dicts[0].keys())
    X = np.array([[fd[k] for k in feature_names] for fd in feature_dicts])
    y = df["nextDayDemand"].values.astype(float)
    return X, y, feature_names


def train_model(
    n_samples: int = SYNTHETIC_SAMPLES,
    history_len: int = SYNTHETIC_HISTORY_LEN,
    seed: int = 42,
) -> dict:
    """
    Full training pipeline:
      • generate data  → engineer features → train → evaluate → save

    Returns a dict with metrics: mae, r2, model_path
    """
    logger.info("Generating %d synthetic samples …", n_samples)
    df = generate_dataset(n_samples, history_len, seed)

    logger.info("Engineering features …")
    X, y, feature_names = _build_Xy(df)

    # 80 / 20 split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=seed
    )

    logger.info("Training XGBRegressor (n=%d features) …", X.shape[1])
    model = XGBRegressor(**XGB_PARAMS)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))
    logger.info("Evaluation  → MAE=%.3f  R²=%.3f", mae, r2)

    # Persist model + feature_names together
    os.makedirs(MODEL_DIR, exist_ok=True)
    artifact = {"model": model, "feature_names": feature_names}
    joblib.dump(artifact, MODEL_PATH)
    logger.info("Model saved → %s", MODEL_PATH)

    return {"mae": mae, "r2": r2, "model_path": MODEL_PATH}


def retrain(**kwargs) -> dict:
    """
    Wrapper exposed for cron / scheduled retraining.
    Accepts the same kwargs as `train_model`.
    """
    logger.info("=== Scheduled retrain started ===")
    result = train_model(**kwargs)
    logger.info("=== Scheduled retrain finished ===")
    return result


# ── CLI entry-point ──────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    metrics = train_model()
    print(f"\n✅  Training complete  →  MAE={metrics['mae']:.3f}  R²={metrics['r2']:.3f}")
    print(f"   Model saved to {metrics['model_path']}")
