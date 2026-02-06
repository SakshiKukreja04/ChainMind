/**
 * Environment Configuration
 * Loads and validates environment variables
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ChainMind',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Groq LLM – used for real-world health-context awareness layer
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
};
