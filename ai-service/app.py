"""
ChainMind AI Demand Forecasting Microservice
=============================================
Flask application factory with Blueprint registration,
central error handling, and auto-training on first start.
"""

import os
import logging
from flask import Flask, jsonify

from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, MODEL_PATH
from routes.predict import predict_bp

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Application factory."""
    app = Flask(__name__)

    # Register blueprints
    app.register_blueprint(predict_bp)

    # ── Central JSON error handlers ──────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Route not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app


def _ensure_model():
    """Train a model on synthetic data if none exists yet."""
    if os.path.exists(MODEL_PATH):
        logger.info("Existing model found at %s — skipping initial training", MODEL_PATH)
        return
    logger.info("No model found — running initial training on synthetic data …")
    from services.trainer import train_model
    metrics = train_model()
    logger.info(
        "Initial training complete  →  MAE=%.3f  R²=%.3f",
        metrics["mae"], metrics["r2"],
    )


# ── Entry-point ──────────────────────────────────────────────────
if __name__ == "__main__":
    _ensure_model()
    app = create_app()
    logger.info("Starting AI service on %s:%s", FLASK_HOST, FLASK_PORT)
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
