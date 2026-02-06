"""
Predictor service — loads the trained model and produces forecasts.

Public API
──────────
  predict(payload: dict) → dict
      Accepts:  { productId, salesHistory, currentStock, leadTimeDays, city? }
      Returns:  { predictedDailyDemand, daysToStockout, suggestedReorderQty,
                  confidence }

The service falls back to a simple moving-average heuristic when the
XGBoost model file is missing — this keeps the endpoint available even
before the first training run.
"""

import os
import logging
import math
import datetime
import numpy as np
import joblib

from config import MODEL_PATH, SAFETY_FACTOR, MIN_HISTORY_LEN
from utils.feature_engineering import extract_features

logger = logging.getLogger(__name__)

# ── Module-level model cache ────────────────────────────────────
_model_cache: dict | None = None


def _load_model() -> dict | None:
    """Load and cache the persisted model artifact."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    if os.path.exists(MODEL_PATH):
        logger.info("Loading model from %s", MODEL_PATH)
        _model_cache = joblib.load(MODEL_PATH)
        return _model_cache
    logger.warning("Model file not found at %s — falling back to heuristic", MODEL_PATH)
    return None


def reload_model() -> bool:
    """Force-reload after retraining. Returns True if model loaded."""
    global _model_cache
    _model_cache = None
    return _load_model() is not None


def _heuristic_predict(sales_history: list, current_stock: float, lead_time: float) -> float:
    """Simple 7-day moving-average fallback when ML model is unavailable."""
    window = sales_history[-7:] if len(sales_history) >= 7 else sales_history
    return float(np.mean(window)) if window else 0.0


def predict(payload: dict) -> dict:
    """
    Run demand prediction for a single product.

    Parameters
    ----------
    payload : dict
        Required keys: salesHistory, currentStock, leadTimeDays
        Optional: productId, city

    Returns
    -------
    dict with: predictedDailyDemand, daysToStockout,
               suggestedReorderQty, confidence, method
    """
    sales_history = payload.get("salesHistory", [])
    current_stock = float(payload.get("currentStock", 0))
    lead_time = float(payload.get("leadTimeDays", 7))
    product_id = payload.get("productId", None)
    city = payload.get("city", None)

    # ── Validate inputs ──────────────────────────────────────────
    if not sales_history or not isinstance(sales_history, list):
        raise ValueError("salesHistory must be a non-empty list of numbers")
    if current_stock < 0:
        raise ValueError("currentStock must be non-negative")
    if lead_time <= 0:
        raise ValueError("leadTimeDays must be positive")

    # ── Predict daily demand ─────────────────────────────────────
    artifact = _load_model()
    method = "xgboost"
    today = datetime.date.today().isoformat()

    if artifact is not None:
        model = artifact["model"]
        feature_names = artifact["feature_names"]

        feats = extract_features(
            sales_history,
            current_stock,
            lead_time,
            city=city,
            ref_date=today,
        )

        # Ensure we only pass features the model expects
        X = np.array([[feats.get(k, 0.0) for k in feature_names]])
        predicted_demand = float(model.predict(X)[0])

        # Confidence: use relative std of residuals on training data as proxy
        rolling_std = feats.get("rolling_std_7", 1.0)
        rolling_mean = feats.get("rolling_mean_7", 1.0)
        cv = rolling_std / rolling_mean if rolling_mean > 0 else 1.0
        confidence = round(max(0.0, min(1.0, 1.0 - cv)), 3)
    else:
        # Fallback heuristic
        predicted_demand = _heuristic_predict(sales_history, current_stock, lead_time)
        confidence = 0.5
        method = "heuristic"

    # Ensure demand is non-negative
    predicted_demand = max(0.0, round(predicted_demand, 2))

    # ── Days to stock-out ────────────────────────────────────────
    if predicted_demand > 0:
        days_to_stockout = max(0, math.floor(current_stock / predicted_demand))
    else:
        days_to_stockout = 999   # Effectively "never"

    # ── Suggested reorder quantity ───────────────────────────────
    # Cover lead-time demand + safety buffer
    lead_time_demand = predicted_demand * lead_time
    suggested_qty = max(0, math.ceil(lead_time_demand * SAFETY_FACTOR))

    result = {
        "predictedDailyDemand": predicted_demand,
        "daysToStockout": days_to_stockout,
        "suggestedReorderQty": suggested_qty,
        "confidence": confidence,
        "method": method,
    }

    if product_id:
        result["productId"] = product_id
    if city:
        result["city"] = city

    logger.info(
        "Prediction [%s/%s] → demand=%.2f  stockout=%dd  reorder=%d  (method=%s, conf=%.2f)",
        product_id or "?", city or "?",
        predicted_demand, days_to_stockout, suggested_qty,
        method, confidence,
    )

    return result
