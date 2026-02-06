"""
Feature engineering for the demand forecasting model.

Converts a raw daily sales history (list[int]) into a flat feature vector
that XGBoost can consume.

Features produced
─────────────────
  rolling_mean_7      – 7-day rolling average of sales
  rolling_mean_14     – 14-day rolling average of sales
  rolling_std_7       – 7-day rolling standard deviation
  rolling_std_14      – 14-day rolling standard deviation
  trend               – difference between last-7-day mean and first-7-day mean
  last_day_sales      – most recent day's sales
  day_of_week         – weekday of the most recent day (0 = Mon … 6 = Sun)
  current_stock       – units currently on hand
  lead_time_days      – vendor delivery lead time
  stock_demand_ratio  – currentStock / rolling_mean_7 (days of cover)
"""

import numpy as np
from config import ROLLING_WINDOWS, MIN_HISTORY_LEN


def extract_features(
    sales_history: list[int | float],
    current_stock: int | float,
    lead_time_days: int | float,
    day_offset: int = 0,
) -> dict[str, float]:
    """
    Build a feature dict from a single product's data.

    Parameters
    ----------
    sales_history : list
        Daily sales values (oldest → newest). Must have at least
        `MIN_HISTORY_LEN` entries.
    current_stock : numeric
        Current inventory on hand.
    lead_time_days : numeric
        Vendor delivery lead-time in days.
    day_offset : int
        Simulated day-of-week offset (used for synthetic data
        where we don't have real dates).

    Returns
    -------
    dict[str, float]  — flat feature map
    """
    arr = np.array(sales_history, dtype=float)

    # Pad with repeated mean if history is too short
    if len(arr) < MIN_HISTORY_LEN:
        pad_val = arr.mean() if len(arr) > 0 else 0.0
        arr = np.pad(arr, (MIN_HISTORY_LEN - len(arr), 0), constant_values=pad_val)

    features: dict[str, float] = {}

    # Rolling statistics for each window size
    for w in ROLLING_WINDOWS:
        window = arr[-w:]
        features[f"rolling_mean_{w}"] = float(np.mean(window))
        features[f"rolling_std_{w}"] = float(np.std(window, ddof=0))

    # Trend: shift between first and last rolling window
    first_window = arr[:ROLLING_WINDOWS[0]]
    last_window = arr[-ROLLING_WINDOWS[0]:]
    features["trend"] = float(np.mean(last_window) - np.mean(first_window))

    # Last day sales
    features["last_day_sales"] = float(arr[-1])

    # Day of week (cycled from history length + offset)
    features["day_of_week"] = float((len(arr) + day_offset) % 7)

    # Inventory / demand indicators
    features["current_stock"] = float(current_stock)
    features["lead_time_days"] = float(lead_time_days)

    # Stock-to-demand ratio (days of cover)
    mean_7 = features["rolling_mean_7"]
    features["stock_demand_ratio"] = (
        float(current_stock / mean_7) if mean_7 > 0 else 999.0
    )

    return features


def extract_features_batch(rows: list[dict]) -> list[dict[str, float]]:
    """
    Vectorised helper — applies `extract_features` to a list of dicts
    each containing salesHistory, currentStock, leadTimeDays.
    """
    return [
        extract_features(
            r["salesHistory"],
            r["currentStock"],
            r["leadTimeDays"],
            day_offset=i,
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
        sample["salesHistory"], sample["currentStock"], sample["leadTimeDays"]
    )
    for k, v in feats.items():
        print(f"  {k:24s} = {v:.4f}")
