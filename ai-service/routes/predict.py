"""
Flask Blueprint — /predict-demand  &  /health  &  /retrain
"""

import logging
import time
from flask import Blueprint, request, jsonify

from services.predictor import predict, reload_model
from services.trainer import retrain

logger = logging.getLogger(__name__)

predict_bp = Blueprint("predict", __name__)


# ── POST /predict-demand ─────────────────────────────────────────
@predict_bp.route("/predict-demand", methods=["POST"])
def predict_demand():
    """
    Accepts JSON:
      { productId, salesHistory, currentStock, leadTimeDays }
    Returns:
      { predictedDailyDemand, daysToStockout, suggestedReorderQty,
        confidence, method }
    """
    start = time.perf_counter()

    body = request.get_json(silent=True)
    if not body:
        return jsonify({"success": False, "error": "Request body must be JSON"}), 400

    # Required field validation
    sales = body.get("salesHistory")
    if not sales or not isinstance(sales, list):
        return jsonify({
            "success": False,
            "error": "salesHistory is required and must be a non-empty array of numbers",
        }), 400

    if body.get("currentStock") is None:
        return jsonify({"success": False, "error": "currentStock is required"}), 400

    try:
        result = predict(body)
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as exc:
        logger.exception("Prediction failed")
        return jsonify({"success": False, "error": f"Prediction error: {exc}"}), 500

    elapsed_ms = (time.perf_counter() - start) * 1000
    result["inferenceTimeMs"] = round(elapsed_ms, 2)
    result["success"] = True

    logger.info("POST /predict-demand → %.1f ms", elapsed_ms)
    return jsonify(result), 200


# ── GET /health ──────────────────────────────────────────────────
@predict_bp.route("/health", methods=["GET"])
def health():
    """Simple liveness / readiness probe."""
    return jsonify({
        "success": True,
        "service": "chainmind-ai",
        "status": "healthy",
    }), 200


# ── POST /retrain ───────────────────────────────────────────────
@predict_bp.route("/retrain", methods=["POST"])
def trigger_retrain():
    """
    Kick off a synchronous retrain.  In production this would be
    dispatched to a background worker / celery task.
    """
    try:
        metrics = retrain()
        reload_model()   # swap in the freshly trained model
        return jsonify({
            "success": True,
            "message": "Model retrained successfully",
            "metrics": metrics,
        }), 200
    except Exception as exc:
        logger.exception("Retrain failed")
        return jsonify({"success": False, "error": str(exc)}), 500
