/**
 * Models Export
 * Central location for all Mongoose models
 * Import models from here for cleaner code organization
 */

const User = require('./User.model');
const Business = require('./Business.model');
const Product = require('./Product.model');
const Vendor = require('./Vendor.model');
const Order = require('./Order.model');
const Alert = require('./Alert.model');
const AiSuggestion = require('./AiSuggestion.model');
const VendorProduct = require('./VendorProduct.model');
const AuditLog = require('./AuditLog.model');
const SalesHistory = require('./SalesHistory.model');

module.exports = {
  User,
  Business,
  Product,
  Vendor,
  Order,
  Alert,
  AiSuggestion,
  VendorProduct,
  AuditLog,
  SalesHistory,
};
