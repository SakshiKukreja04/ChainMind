/**
 * Express Application Setup
 * Core app configuration and middleware
 */

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const vendorRoutes = require('./routes/vendor.routes');

const app = express();

/**
 * Middleware
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routes
 */
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Application Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
