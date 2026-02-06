"""
Feature engineering for the demand forecasting model.
=====================================================

Converts raw daily sales history into a flat feature vector for XGBoost.

Two entry-points:
  extract_features()         – for a single product (inference + synthetic training)
  extract_features_batch()   – for bulk rows

Features produced
─────────────────
  rolling_mean_7      – 7-day rolling average of sales
  rolling_mean_14     – 14-day rolling average of sales
  rolling_mean_30     – 30-day rolling average
  rolling_std_7       – 7-day rolling standard deviation
  rolling_std_14      – 14-day rolling standard deviation
  lag_7               – sales value 7 days ago
  lag_30              – sales value 30 days ago
  trend               – difference between recent-7 and first-7 means
  last_day_sales      – most recent day's sales
  day_of_week         – 0–6
  month               – 1–12 (seasonal signal)
  week_of_year        – 1–53 (finer seasonal signal)
  city_encoded        – numeric code for the city
  current_stock       – units currently on hand
  lead_time_days      – vendor delivery lead-time
  stock_demand_ratio  – currentStock / rolling_mean_7
"""

import numpy as np
from config import ROLLING_WINDOWS, MIN_HISTORY_LEN

# ── City encoder (alphabetical → deterministic) ─────────────────
CITY_MAP = {
    "bangalore": 0,
    "chennai": 1,
    "delhi": 2,
    "mumbai": 3,
    "pune": 4,
}
CITY_DEFAULT = -1  # unknown city


def _encode_city(city: str | None) -> float:
    if city is None:
        return float(CITY_DEFAULT)
    return float(CITY_MAP.get(city.strip().lower(), CITY_DEFAULT))


def extract_features(
    sales_history: list[int | float],
    current_stock: int | float,
    lead_time_days: int | float,
    day_offset: int = 0,
    city: str | None = None,
    ref_date=None,
) -> dict[str, float]:
    """
    Build a feature dict from a single product's data.

    Parameters
    ----------
    sales_history : list
        Daily sales values (oldest → newest).
    current_stock : numeric
    lead_time_days : numeric
    day_offset : int
        Simulated day-of-week offset (synthetic data).
    city : str | None
        Optional city name for location encoding.
    ref_date : date-like | None
        Reference date for month / week_of_year. Falls back to
        array-length heuristic when missing.
    """
    arr = np.array(sales_history, dtype=float)

    # Pad if too short
    if len(arr) < MIN_HISTORY_LEN:
        pad_val = arr.mean() if len(arr) > 0 else 0.0
        arr = np.pad(arr, (MIN_HISTORY_LEN - len(arr), 0), constant_values=pad_val)

    features: dict[str, float] = {}

    # ── Rolling statistics ───────────────────────────────────────
    for w in ROLLING_WINDOWS:
        window = arr[-w:]
        features[f"rolling_mean_{w}"] = float(np.mean(window))
        features[f"rolling_std_{w}"] = float(np.std(window, ddof=0))

    # 30-day rolling mean
    w30 = arr[-30:] if len(arr) >= 30 else arr
    features["rolling_mean_30"] = float(np.mean(w30))

    # ── Lag features ─────────────────────────────────────────────
    features["lag_7"] = float(arr[-7]) if len(arr) >= 7 else float(arr[0])
    features["lag_30"] = float(arr[-30]) if len(arr) >= 30 else float(arr[0])

    # ── Trend ────────────────────────────────────────────────────
    first_window = arr[: ROLLING_WINDOWS[0]]
    last_window = arr[-ROLLING_WINDOWS[0] :]
    features["trend"] = float(np.mean(last_window) - np.mean(first_window))

    # ── Last day sales ───────────────────────────────────────────
    features["last_day_sales"] = float(arr[-1])

    # ── Calendar features ────────────────────────────────────────
    if ref_date is not None:
        import datetime as _dt

        if isinstance(ref_date, str):
            ref_date = _dt.date.fromisoformat(ref_date)
        features["day_of_week"] = float(ref_date.weekday())       # 0=Mon
        features["month"] = float(ref_date.month)                 # 1-12
        features["week_of_year"] = float(ref_date.isocalendar()[1])
    else:
        features["day_of_week"] = float((len(arr) + day_offset) % 7)
        features["month"] = 1.0           # fallback
        features["week_of_year"] = 1.0

    # ── City encoding ────────────────────────────────────────────
    features["city_encoded"] = _encode_city(city)

    # ── Inventory / demand indicators ────────────────────────────
    features["current_stock"] = float(current_stock)
    features["lead_time_days"] = float(lead_time_days)

    mean_7 = features["rolling_mean_7"]
    features["stock_demand_ratio"] = (
        float(current_stock / mean_7) if mean_7 > 0 else 999.0
    )

    return features


def extract_features_batch(rows: list[dict]) -> list[dict[str, float]]:
    """
    Vectorised helper — applies `extract_features` to a list of dicts
    each containing salesHistory, currentStock, leadTimeDays, and
    optionally city / ref_date.
    """
    return [
        extract_features(
            r["salesHistory"],
            r["currentStock"],
            r["leadTimeDays"],
            day_offset=i,
            city=r.get("city"),
            ref_date=r.get("ref_date"),
        )
        for i, r in enumerate(rows)
    ]


# ── Quick CLI test ───────────────────────────────────────────────
if __name__ == "__main__":
    sample = {
        "salesHistory": [12, 15, 13, 20, 18, 14, 16, 22, 19, 17, 21, 14, 18, 20],
        "currentStock": 120,
        "leadTimeDays": 7,
    }
    feats = extract_features(
        sample["salesHistory"],
        sample["currentStock"],
        sample["leadTimeDays"],
        city="mumbai",
        ref_date="2025-07-15",
    )
    for k, v in sorted(feats.items()):
        print(f"  {k:24s} = {v:.4f}")
