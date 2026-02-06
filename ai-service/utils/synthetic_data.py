"""
Synthetic data generator for training the demand forecasting model.

Produces realistic daily-sales time-series with:
  • Base demand (Poisson-distributed)
  • Weekly seasonality (weekends dip)
  • Monthly seasonality (summer / festive spikes)
  • City-based location bias
  • Random noise
  • Trend component
  • Varying lead-times and current-stock levels

Each sample is a window of N days, labelled with the *next-day* demand.
"""

import datetime
import numpy as np
import pandas as pd
from config import SYNTHETIC_SAMPLES, SYNTHETIC_HISTORY_LEN

# ── Seasonality constants ────────────────────────────────────────

CITIES = ["mumbai", "pune", "delhi", "bangalore", "chennai"]

CITY_BIAS = {
    "mumbai": 1.35,
    "pune": 1.05,
    "delhi": 1.15,
    "bangalore": 1.0,
    "chennai": 0.85,
}

# 0=Jan … 11=Dec
MONTH_SEASONALITY = [
    0.70, 0.72, 0.85, 0.95, 1.15, 1.30,
    1.35, 1.20, 1.00, 1.10, 1.25, 1.30,
]

WEEKDAY_FACTOR = [1.0, 1.05, 1.02, 0.98, 1.10, 0.80, 0.70]  # Mon-Sun


def generate_single_series(
    history_len: int = SYNTHETIC_HISTORY_LEN,
    base_demand: float | None = None,
    rng: np.random.Generator | None = None,
    city: str | None = None,
) -> dict:
    """
    Generate one synthetic product sales history.

    Returns
    -------
    dict with keys:
        salesHistory  – list[int]
        currentStock  – int
        leadTimeDays  – int
        nextDayDemand – float       (label)
        city          – str
        ref_date      – str (ISO)   (date of the label day)
    """
    rng = rng or np.random.default_rng()

    if base_demand is None:
        base_demand = rng.uniform(5, 80)

    if city is None:
        city = rng.choice(CITIES)

    city_mult = CITY_BIAS.get(city, 1.0)

    # Small linear trend
    trend_slope = rng.uniform(-0.3, 0.3)

    # Random start date within the last 2 years
    today = datetime.date.today()
    start_offset = rng.integers(0, 365)
    start_date = today - datetime.timedelta(days=history_len + 1 + int(start_offset))

    sales = []
    dates = []
    for day in range(history_len + 1):
        d = start_date + datetime.timedelta(days=day)
        month = d.month - 1               # 0-indexed
        weekday = d.weekday()             # 0=Mon

        seasonal = MONTH_SEASONALITY[month]
        wk = WEEKDAY_FACTOR[weekday]
        noise = rng.normal(0, base_demand * 0.15)
        trend = trend_slope * day

        daily = max(0, base_demand * seasonal * city_mult * wk + trend + noise)
        sales.append(round(daily))
        dates.append(d)

    history = sales[:-1]
    next_day = float(sales[-1])
    ref_date = dates[-1].isoformat()

    current_stock = int(rng.integers(0, max(1, int(base_demand * 15))))
    lead_time = int(rng.integers(1, 22))

    return {
        "salesHistory": history,
        "currentStock": current_stock,
        "leadTimeDays": lead_time,
        "nextDayDemand": next_day,
        "city": city,
        "ref_date": ref_date,
    }


def generate_dataset(
    n_samples: int = SYNTHETIC_SAMPLES,
    history_len: int = SYNTHETIC_HISTORY_LEN,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Build a DataFrame with `n_samples` synthetic rows ready for feature
    engineering.

    Columns: salesHistory, currentStock, leadTimeDays, nextDayDemand, city, ref_date
    """
    rng = np.random.default_rng(seed)
    rows = [generate_single_series(history_len, rng=rng) for _ in range(n_samples)]
    return pd.DataFrame(rows)


# ── Quick CLI test ───────────────────────────────────────────────
if __name__ == "__main__":
    df = generate_dataset(10)
    print(df[["city", "currentStock", "leadTimeDays", "nextDayDemand", "ref_date"]].head(10))
    print(f"\nShape: {df.shape}")
    print(f"Cities: {df['city'].value_counts().to_dict()}")
