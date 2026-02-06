"""
Configuration for the ChainMind AI Demand Forecasting Service.
All tuneable parameters live here — no hardcoded values in service code.
"""

import os

# ── Flask ────────────────────────────────────────────────────────
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5001))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"

# ── Model Persistence ───────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "demand_model.pkl")

# ── Feature Engineering ─────────────────────────────────────────
ROLLING_WINDOWS = [7, 14]          # Days for rolling mean / std
MIN_HISTORY_LEN = 14               # Minimum sales history length

# ── XGBoost Hyper-parameters ────────────────────────────────────
XGB_PARAMS = {
    "n_estimators": 200,
    "max_depth": 5,
    "learning_rate": 0.08,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "objective": "reg:squarederror",
}

# ── Synthetic Data ──────────────────────────────────────────────
SYNTHETIC_SAMPLES = 2000           # Rows for training data generation
SYNTHETIC_HISTORY_LEN = 60         # Days per sample

# ── Safety Factor (buffer for reorder qty) ──────────────────────
SAFETY_FACTOR = 1.25               # 25 % buffer over lead-time demand

# ── Node Backend URL (for future pull-based integration) ────────
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")
