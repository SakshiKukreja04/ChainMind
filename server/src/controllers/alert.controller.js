/**
 * Alert Controller
 * CRUD for stock alerts
 */

const Alert = require('../models/Alert.model');

/**
 * GET /api/alerts
 * List alerts for the authenticated user's business
 */
const getAlerts = async (req, res) => {
  try {
    const { businessId } = req.user;

    const alerts = await Alert.find({ businessId, isActive: true })
      .populate('productId', 'name sku')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: alerts.length,
      alerts: alerts.map((a) => ({
        id: a._id,
        type: a.type === 'OUT_OF_STOCK' ? 'stock' : a.type === 'LOW_STOCK' ? 'stock' : 'stock',
        title:
          a.type === 'OUT_OF_STOCK'
            ? 'Out of Stock'
            : a.type === 'LOW_STOCK'
            ? 'Low Stock Alert'
            : 'Stock Correction',
        message: a.message,
        severity:
          a.severity === 'CRITICAL' ? 'error' : 'warning',
        productId: a.productId?._id,
        productName: a.productId?.name || 'Unknown',
        productSku: a.productId?.sku || '',
        currentStock: a.currentStock,
        minThreshold: a.minThreshold,
        read: a.read,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get Alerts Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts', error: error.message });
  }
};

/**
 * PUT /api/alerts/:id/read
 * Mark an alert as read
 */
const markAlertRead = async (req, res) => {
  try {
    const { businessId } = req.user;

    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { read: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({ success: true, message: 'Alert marked as read' });
  } catch (error) {
    console.error('Mark Alert Read Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark alert', error: error.message });
  }
};

/**
 * PUT /api/alerts/read-all
 * Mark all alerts as read
 */
const markAllRead = async (req, res) => {
  try {
    const { businessId } = req.user;

    await Alert.updateMany({ businessId, read: false }, { read: true });

    res.status(200).json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    console.error('Mark All Read Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark all alerts', error: error.message });
  }
};

module.exports = {
  getAlerts,
  markAlertRead,
  markAllRead,
};
