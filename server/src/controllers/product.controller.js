/**
 * Product Controller
 * Inventory CRUD + stock operations
 */

const { Product } = require('../models');
const Alert = require('../models/Alert.model');
const { checkThreshold } = require('../services/stock.service');
const { getSocket } = require('../sockets');

/**
 * GET /api/products
 * List all products for the authenticated user's business
 */
const getProducts = async (req, res) => {
  try {
    const { businessId } = req.user;

    const products = await Product.find({ businessId, isActive: true })
      .populate('vendorId', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.currentStock,
        minThreshold: p.minThreshold,
        vendorId: p.vendorId?._id || null,
        vendorName: p.vendorId?.name || 'Unassigned',
        status:
          p.currentStock === 0
            ? 'out-of-stock'
            : p.currentStock < p.minThreshold
            ? 'low-stock'
            : 'in-stock',
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get Products Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

/**
 * GET /api/products/:id
 * Get single product
 */
const getProduct = async (req, res) => {
  try {
    const { businessId } = req.user;
    const product = await Product.findOne({ _id: req.params.id, businessId }).populate('vendorId', 'name email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        currentStock: product.currentStock,
        minThreshold: product.minThreshold,
        vendorId: product.vendorId?._id || null,
        vendorName: product.vendorId?.name || 'Unassigned',
        status:
          product.currentStock === 0
            ? 'out-of-stock'
            : product.currentStock < product.minThreshold
            ? 'low-stock'
            : 'in-stock',
        description: product.description,
      },
    });
  } catch (error) {
    console.error('Get Product Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch product', error: error.message });
  }
};

/**
 * POST /api/products
 * Add a new product (MANAGER only)
 */
const addProduct = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { name, sku, category, costPrice, sellingPrice, currentStock, minThreshold, vendorId, description } = req.body;

    // Validation
    if (!name || !sku || !category || costPrice == null || sellingPrice == null) {
      return res.status(400).json({
        success: false,
        message: 'name, sku, category, costPrice, and sellingPrice are required',
      });
    }

    // Check duplicate SKU within business
    const exists = await Product.findOne({ sku: sku.toUpperCase(), businessId });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Product with SKU "${sku}" already exists in this business`,
      });
    }

    const product = await Product.create({
      name: name.trim(),
      sku: sku.toUpperCase().trim(),
      category: category.trim(),
      costPrice,
      sellingPrice,
      currentStock: currentStock || 0,
      minThreshold: minThreshold || 10,
      vendorId: vendorId || null,
      businessId,
      description: description || null,
      isActive: true,
    });

    // Populate vendor for response
    await product.populate('vendorId', 'name email');

    const io = getSocket();
    const payload = {
      id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock,
      minThreshold: product.minThreshold,
      vendorId: product.vendorId?._id || null,
      vendorName: product.vendorId?.name || 'Unassigned',
      status:
        product.currentStock === 0
          ? 'out-of-stock'
          : product.currentStock < product.minThreshold
          ? 'low-stock'
          : 'in-stock',
    };
    io.emit('inventory:product-added', payload);

    // Check threshold on creation
    await checkThreshold(product);

    console.log(`✓ Product added: ${product.name} (${product.sku})`);

    res.status(201).json({ success: true, message: 'Product added successfully', product: payload });
  } catch (error) {
    console.error('Add Product Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add product', error: error.message });
  }
};

/**
 * PUT /api/products/:id
 * Update product details (MANAGER only)
 */
const updateProduct = async (req, res) => {
  try {
    const { businessId } = req.user;
    const updates = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('vendorId', 'name email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const io = getSocket();
    io.emit('inventory:stock-updated', {
      id: product._id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock,
      minThreshold: product.minThreshold,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated',
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        currentStock: product.currentStock,
        minThreshold: product.minThreshold,
        vendorId: product.vendorId?._id || null,
        vendorName: product.vendorId?.name || 'Unassigned',
        status:
          product.currentStock === 0
            ? 'out-of-stock'
            : product.currentStock < product.minThreshold
            ? 'low-stock'
            : 'in-stock',
      },
    });
  } catch (error) {
    console.error('Update Product Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update product', error: error.message });
  }
};

/**
 * PUT /api/products/:id/stock
 * Increment/decrement stock (sales / delivery)
 */
const updateStock = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { change } = req.body;

    if (change == null || typeof change !== 'number') {
      return res.status(400).json({ success: false, message: '"change" (number) is required' });
    }

    const product = await Product.findOne({ _id: req.params.id, businessId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newStock = product.currentStock + change;
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce stock below 0. Current: ${product.currentStock}, change: ${change}`,
      });
    }

    product.currentStock = newStock;
    await product.save();

    const io = getSocket();
    io.emit('inventory:stock-updated', {
      id: product._id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock,
      minThreshold: product.minThreshold,
      change,
    });

    // Threshold check
    await checkThreshold(product);

    res.status(200).json({
      success: true,
      message: `Stock updated by ${change > 0 ? '+' : ''}${change}`,
      product: {
        id: product._id,
        name: product.name,
        currentStock: product.currentStock,
        status:
          product.currentStock === 0
            ? 'out-of-stock'
            : product.currentStock < product.minThreshold
            ? 'low-stock'
            : 'in-stock',
      },
    });
  } catch (error) {
    console.error('Update Stock Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update stock', error: error.message });
  }
};

/**
 * PUT /api/products/:id/correct
 * Correct stock to actual physical count
 */
const correctStock = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { actualStock, reason } = req.body;

    if (actualStock == null || typeof actualStock !== 'number' || actualStock < 0) {
      return res.status(400).json({ success: false, message: '"actualStock" (non-negative number) is required' });
    }

    const product = await Product.findOne({ _id: req.params.id, businessId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousStock = product.currentStock;
    product.currentStock = actualStock;
    await product.save();

    const io = getSocket();
    io.emit('inventory:stock-corrected', {
      id: product._id,
      name: product.name,
      sku: product.sku,
      previousStock,
      currentStock: product.currentStock,
      reason: reason || 'Physical count correction',
    });

    // Threshold check
    await checkThreshold(product);

    res.status(200).json({
      success: true,
      message: `Stock corrected from ${previousStock} to ${actualStock}`,
      product: {
        id: product._id,
        name: product.name,
        currentStock: product.currentStock,
        previousStock,
        status:
          product.currentStock === 0
            ? 'out-of-stock'
            : product.currentStock < product.minThreshold
            ? 'low-stock'
            : 'in-stock',
      },
    });
  } catch (error) {
    console.error('Correct Stock Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to correct stock', error: error.message });
  }
};

/**
 * PUT /api/products/:id/assign-vendor
 * Assign a vendor to a product
 */
const assignVendor = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: '"vendorId" is required' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { vendorId },
      { new: true }
    ).populate('vendorId', 'name email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const io = getSocket();
    io.emit('inventory:vendor-assigned', {
      id: product._id,
      name: product.name,
      vendorId: product.vendorId?._id,
      vendorName: product.vendorId?.name || 'Unknown',
    });

    res.status(200).json({
      success: true,
      message: 'Vendor assigned successfully',
      product: {
        id: product._id,
        name: product.name,
        vendorId: product.vendorId?._id,
        vendorName: product.vendorId?.name || 'Unknown',
      },
    });
  } catch (error) {
    console.error('Assign Vendor Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to assign vendor', error: error.message });
  }
};

/**
 * DELETE /api/products/:id
 * Soft-delete product
 */
const deleteProduct = async (req, res) => {
  try {
    const { businessId } = req.user;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete Product Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  updateStock,
  correctStock,
  assignVendor,
  deleteProduct,
};
