/**
 * LLM Context Awareness Service (Groq)
 *
 * Uses a Groq-hosted LLM to detect real-world health context
 * (outbreaks, infections, seasonal illnesses) that may affect
 * pharmaceutical demand.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  The LLM does NOT predict demand.                       │
 * │  It only answers: "Is there a health situation that      │
 * │  could increase demand for <medicine> in <city>?"       │
 * │                                                          │
 * │  Response format:  { signal, confidence, reason }        │
 * │    signal      – "YES" | "NO"                           │
 * │    confidence  – 0.0 … 1.0                              │
 * │    reason      – human-readable explanation              │
 * └──────────────────────────────────────────────────────────┘
 *
 * Failure-safe: if the Groq API is down, key is missing, or
 * the response is unparseable, the service returns a safe
 * NO-signal so the ML pipeline continues unmodified.
 */

const axios = require('axios');
const env = require('../config/env');

// ── Configuration ────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT_MS = 8000; // generous but bounded
const CONTEXT_BOOST_MULTIPLIER = 0.35; // max +35 % demand uplift

// ── Safe fallback (no context, no boost) ─────────────────────────
const SAFE_FALLBACK = Object.freeze({
  signal: 'NO',
  confidence: 0,
  reason: 'LLM context unavailable – using base ML prediction',
});

// ── Prompt builder ───────────────────────────────────────────────
/**
 * @param {Object} ctx
 * @param {string} ctx.productName  – product / medicine name
 * @param {string} ctx.city         – business location (city, region, country)
 * @param {string} ctx.industry     – business industry (e.g. "pharmacy")
 * @param {string} ctx.category     – product category (e.g. "Antihistamines")
 * @param {string} ctx.currentDate  – ISO date string
 */
function buildPrompt({ productName, city, industry, category, currentDate }) {
  return `You are a demand intelligence analyst specializing in ${industry || 'general'} supply chains.

Today is ${currentDate}.

Business context:
  - Industry: ${industry || 'Not specified'}
  - Location: ${city || 'Not specified'}

Product context:
  - Product name: "${productName}"
  - Category: ${category || 'Not specified'}

Task:
Based on the business location, industry, and product category above, determine
whether there is currently (or is very likely to be within the next 14 days) a
real‑world situation that would significantly increase the demand for
"${productName}" in "${city}".

Consider ALL of the following that apply to the industry & category:
  • Health & pharma: disease outbreaks, seasonal illness spikes (flu, dengue,
    allergies), epidemics, infection waves, public‑health emergencies
  • Retail & FMCG: seasonal consumption surges (festivals, holidays, monsoon,
    summer, back‑to‑school), weather‑driven demand shifts
  • General: any well‑known regional or seasonal pattern that strongly correlates
    with higher demand for this product category in this location

Rules:
1. Focus on factors relevant to the **industry** and **product category** — not
   generic economic or political events.
2. Use well‑known seasonal patterns for the specific **location** (climate,
   cultural calendar, endemic diseases, monsoon timing, festival dates, etc.).
3. Be conservative: only say YES if the evidence is strong and the demand uplift
   would be meaningful (>10 %).

You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside):
{
  "signal": "YES" or "NO",
  "confidence": <number between 0.0 and 1.0>,
  "reason": "<one-sentence explanation referencing location + category>"
}`;
}

// ── Core: query Groq LLM ─────────────────────────────────────────
/**
 * Detect real-world context that may affect demand.
 *
 * @param {Object}  opts
 * @param {string}  opts.productName – product / medicine name
 * @param {string}  [opts.city]      – business location
 * @param {string}  [opts.industry]  – business industry
 * @param {string}  [opts.category]  – product category
 * @returns {Promise<{signal: string, confidence: number, reason: string}>}
 */
async function detectHealthContext({ productName, city, industry, category } = {}) {
  // Guard: no API key → silent fallback
  if (!env.GROQ_API_KEY) {
    console.warn('[LLM-Context] GROQ_API_KEY not set – skipping context detection');
    return { ...SAFE_FALLBACK };
  }

  const currentDate = new Date().toISOString().slice(0, 10);

  console.log('[LLM-Context] Request →', { productName, city, industry, category });

  try {
    const { data } = await axios.post(
      GROQ_API_URL,
      {
        model: env.GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a JSON-only assistant. You must respond with a single valid JSON object and nothing else.',
          },
          {
            role: 'user',
            content: buildPrompt({ productName, city, industry, category, currentDate }),
          },
        ],
        temperature: 0.2, // low creativity – we want factual analysis
        max_tokens: 256,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: GROQ_TIMEOUT_MS,
      },
    );

    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) {
      console.warn('[LLM-Context] Empty LLM response – using fallback');
      return { ...SAFE_FALLBACK };
    }

    return parseContextResponse(raw);
  } catch (err) {
    console.error(
      '[LLM-Context] Groq API error:',
      err.response?.data?.error?.message || err.message,
    );
    return { ...SAFE_FALLBACK };
  }
}

// ── Response parser with strict validation ───────────────────────
function parseContextResponse(raw) {
  try {
    // Strip possible markdown fences the LLM might add despite instructions
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    const signal = String(parsed.signal || '').toUpperCase();
    const confidence = Number(parsed.confidence);
    const reason = String(parsed.reason || '').slice(0, 500);

    if (!['YES', 'NO'].includes(signal) || isNaN(confidence)) {
      console.warn('[LLM-Context] Malformed LLM payload – using fallback', parsed);
      return { ...SAFE_FALLBACK };
    }

    const clampedConfidence = Math.max(0, Math.min(1, confidence));

    console.log('[LLM-Context] Detection result:', { signal, confidence: clampedConfidence, reason });

    return { signal, confidence: clampedConfidence, reason };
  } catch (parseErr) {
    console.warn('[LLM-Context] JSON parse failed – using fallback:', parseErr.message);
    return { ...SAFE_FALLBACK };
  }
}

// ── Demand adjustment helper ─────────────────────────────────────
/**
 * Given a base ML prediction and the LLM context result,
 * compute the adjusted demand figures.
 *
 * If signal === "YES", boost demand by `confidence × CONTEXT_BOOST_MULTIPLIER`.
 * Otherwise return the original prediction untouched.
 *
 * @param {Object} prediction  – original ML prediction
 * @param {Object} context     – { signal, confidence, reason } from detectHealthContext
 * @returns {Object} adjusted prediction with llmContext metadata
 */
function applyContextBoost(prediction, context) {
  const result = { ...prediction };

  // Attach LLM context metadata regardless of signal
  result.llmContext = {
    signal: context.signal,
    confidence: context.confidence,
    reason: context.reason,
    contextBoostApplied: false,
    boostMultiplier: 0,
  };

  if (context.signal === 'YES' && context.confidence > 0) {
    const boost = context.confidence * CONTEXT_BOOST_MULTIPLIER;
    const multiplier = 1 + boost;

    result.predictedDailyDemand = Math.round(
      (prediction.predictedDailyDemand || 0) * multiplier,
    );
    result.suggestedReorderQty = Math.round(
      (prediction.suggestedReorderQty || 0) * multiplier,
    );

    // Stockout days decrease when demand rises
    if (prediction.daysToStockout && prediction.daysToStockout > 0) {
      result.daysToStockout = Math.max(
        1,
        Math.round(prediction.daysToStockout / multiplier),
      );
    }

    result.llmContext.contextBoostApplied = true;
    result.llmContext.boostMultiplier = parseFloat(boost.toFixed(4));

    console.log(
      `[LLM-Context] Demand boosted ×${multiplier.toFixed(3)} → ` +
        `daily=${result.predictedDailyDemand}, reorder=${result.suggestedReorderQty}`,
    );
  }

  return result;
}

module.exports = {
  detectHealthContext,
  applyContextBoost,
  SAFE_FALLBACK,
  CONTEXT_BOOST_MULTIPLIER,
};
