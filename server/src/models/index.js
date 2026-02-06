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

module.exports = {
  User,
  Business,
  Product,
  Vendor,
  Order,
};
