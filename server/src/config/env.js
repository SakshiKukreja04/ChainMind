/**
 * Environment Configuration
 * Loads and validates environment variables
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/chainmind',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:6000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
