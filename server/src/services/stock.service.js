/**
 * Stock Service
 * Threshold engine — checks stock levels and creates alerts
 */

const Alert = require('../models/Alert.model');
const { getSocket } = require('../sockets');

/**
 * Check if a product's stock is below its minimum threshold.
 * If so, create an Alert document and emit a Socket.IO event.
 *
 * @param {Object} product - Mongoose product document (after save)
 */
const checkThreshold = async (product) => {
  try {
    const io = getSocket();

    // Out of stock
    if (product.currentStock === 0) {
      const alert = await Alert.create({
        productId: product._id,
        businessId: product.businessId,
        type: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        message: `${product.name} is out of stock`,
        currentStock: 0,
        minThreshold: product.minThreshold,
      });

      io.emit('inventory:low-stock-alert', {
        alertId: alert._id,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        currentStock: 0,
        minThreshold: product.minThreshold,
        severity: 'CRITICAL',
        message: alert.message,
      });

      console.log(`⚠  CRITICAL: ${product.name} is OUT OF STOCK`);
      return alert;
    }

    // Below minimum threshold
    if (product.currentStock < product.minThreshold) {
      const severity = product.currentStock < product.minThreshold * 0.5 ? 'CRITICAL' : 'LOW';

      const alert = await Alert.create({
        productId: product._id,
        businessId: product.businessId,
        type: 'LOW_STOCK',
        severity,
        message: `${product.name} stock (${product.currentStock}) is below threshold (${product.minThreshold})`,
        currentStock: product.currentStock,
        minThreshold: product.minThreshold,
      });

      io.emit('inventory:low-stock-alert', {
        alertId: alert._id,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        currentStock: product.currentStock,
        minThreshold: product.minThreshold,
        severity,
        message: alert.message,
      });

      console.log(`⚠  ${severity}: ${product.name} stock is below threshold`);
      return alert;
    }

    return null;
  } catch (err) {
    console.error('Stock threshold check failed:', err.message);
    return null;
  }
};

module.exports = { checkThreshold };
