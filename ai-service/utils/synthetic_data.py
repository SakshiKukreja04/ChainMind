"""
Synthetic data generator for training the demand forecasting model.

Produces realistic daily-sales time-series with:
  • Base demand (Poisson-distributed)
  • Weekly seasonality (weekends dip)
  • Random noise
  • Trend component
  • Varying lead-times and current-stock levels

Each sample is a window of N days, labelled with the *next-day* demand.
"""

import numpy as np
import pandas as pd
from config import SYNTHETIC_SAMPLES, SYNTHETIC_HISTORY_LEN


def generate_single_series(
    history_len: int = SYNTHETIC_HISTORY_LEN,
    base_demand: float | None = None,
    rng: np.random.Generator | None = None,
) -> dict:
    """
    Generate one synthetic product sales history.

    Returns
    -------
    dict with keys:
        salesHistory  – list[int]   daily sales over `history_len` days
        currentStock  – int         randomly generated current stock
        leadTimeDays  – int         vendor lead time (1-21 days)
        nextDayDemand – float       label for supervised learning
    """
    rng = rng or np.random.default_rng()

    # Random base demand between 5 and 80 units / day
    if base_demand is None:
        base_demand = rng.uniform(5, 80)

    # Weekly seasonality multiplier (index 0 = Monday)
    weekday_factors = np.array([1.0, 1.05, 1.02, 0.98, 1.10, 0.85, 0.75])

    # Small linear trend (up or down)
    trend_slope = rng.uniform(-0.3, 0.3)

    sales = []
    for day in range(history_len + 1):  # +1 for the label (nextDayDemand)
        weekday = day % 7
        trend = trend_slope * day
        noise = rng.normal(0, base_demand * 0.15)   # 15 % relative noise
        daily = max(0, base_demand * weekday_factors[weekday] + trend + noise)
        sales.append(round(daily))

    history = sales[:-1]           # input window
    next_day = float(sales[-1])    # label

    current_stock = int(rng.integers(0, base_demand * 15))
    lead_time = int(rng.integers(1, 22))

    return {
        "salesHistory": history,
        "currentStock": current_stock,
        "leadTimeDays": lead_time,
        "nextDayDemand": next_day,
    }


def generate_dataset(
    n_samples: int = SYNTHETIC_SAMPLES,
    history_len: int = SYNTHETIC_HISTORY_LEN,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Build a DataFrame with `n_samples` synthetic rows ready for feature
    engineering.

    Columns: salesHistory, currentStock, leadTimeDays, nextDayDemand
    """
    rng = np.random.default_rng(seed)
    rows = [generate_single_series(history_len, rng=rng) for _ in range(n_samples)]
    return pd.DataFrame(rows)


# ── Quick CLI test ───────────────────────────────────────────────
if __name__ == "__main__":
    df = generate_dataset(10)
    print(df.head())
    print(f"\nShape: {df.shape}")
    print(f"Avg history length: {df['salesHistory'].apply(len).mean():.0f}")
